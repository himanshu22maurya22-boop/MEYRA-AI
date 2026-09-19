package ai.meyra.app.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import ai.meyra.app.MeyraApplication
import ai.meyra.app.config.AppConfig
import ai.meyra.app.data.api.NetworkResult
import ai.meyra.app.data.model.ChatMessage
import ai.meyra.app.data.model.MessageRole
import ai.meyra.app.data.model.Suggestion
import ai.meyra.app.data.repository.ChatRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID

class ChatViewModel(
    application: Application
) : AndroidViewModel(application) {

    private val repository: ChatRepository = (application as MeyraApplication).chatRepository

    private val _uiState = MutableStateFlow(
        ChatUiState(backendUrl = AppConfig.getBackendUrl(application))
    )
    val uiState: StateFlow<ChatUiState> = _uiState.asStateFlow()

    private var activeJob: Job? = null
    private var lastFailedUserMessage: String? = null

    init {
        checkBackendHealth()
    }

    val chatRepository: ChatRepository get() = repository

    fun onInputChanged(text: String) {
        _uiState.update { it.copy(inputText = text) }
    }

    fun selectSuggestion(suggestion: Suggestion) {
        sendMessage(promptOverride = suggestion.prompt)
    }

    fun sendMessage(promptOverride: String? = null) {
        val currentText = promptOverride ?: _uiState.value.inputText
        val trimmed = currentText.trim()
        if (trimmed.isEmpty() || _uiState.value.isLoading) return

        val userMessage = ChatMessage(
            id = UUID.randomUUID().toString(),
            role = MessageRole.user,
            content = trimmed
        )

        val historySnapshot = _uiState.value.messages.filter { !it.isError }

        // Clear input and show user message immediately
        _uiState.update { current ->
            current.copy(
                inputText = if (promptOverride == null) "" else current.inputText,
                messages = current.messages + userMessage,
                isLoading = true,
                error = null,
                canRetry = false
            )
        }

        lastFailedUserMessage = trimmed
        executeChatRequest(historySnapshot, trimmed)
    }

    private fun executeChatRequest(history: List<ChatMessage>, prompt: String) {
        activeJob?.cancel()
        activeJob = viewModelScope.launch {
            // Placeholder ID for the streaming / incoming assistant message
            val assistantMessageId = UUID.randomUUID().toString()
            var hasStartedReceiving = false

            try {
                repository.streamMessage(history, prompt).collect { result ->
                    when (result) {
                        is NetworkResult.Success -> {
                            val chunkText = result.data
                            if (!hasStartedReceiving) {
                                hasStartedReceiving = true
                                val newAssistantMsg = ChatMessage(
                                    id = assistantMessageId,
                                    role = MessageRole.assistant,
                                    content = chunkText,
                                    isStreaming = true
                                )
                                _uiState.update { state ->
                                    state.copy(
                                        messages = state.messages + newAssistantMsg,
                                        isLoading = false // Start showing content
                                    )
                                }
                            } else {
                                _uiState.update { state ->
                                    val updatedMessages = state.messages.map { msg ->
                                        if (msg.id == assistantMessageId) {
                                            msg.copy(content = msg.content + chunkText)
                                        } else {
                                            msg
                                        }
                                    }
                                    state.copy(messages = updatedMessages)
                                }
                            }
                        }
                        is NetworkResult.Error -> {
                            handleChatError(result.message)
                        }
                        is NetworkResult.Loading -> {
                            // Already in loading state
                        }
                    }
                }

                // Mark streaming as complete if an assistant message was created
                if (hasStartedReceiving) {
                    _uiState.update { state ->
                        val finalMessages = state.messages.map { msg ->
                            if (msg.id == assistantMessageId) {
                                msg.copy(isStreaming = false)
                            } else {
                                msg
                            }
                        }
                        state.copy(messages = finalMessages, isLoading = false, error = null)
                    }
                    lastFailedUserMessage = null
                }
            } catch (e: Exception) {
                // If stream collector failed or was cancelled
                if (hasStartedReceiving) {
                    _uiState.update { it.copy(isLoading = false) }
                } else {
                    // Try fallback to standard non-streaming POST /api/chat
                    fallbackNonStreaming(history, prompt)
                }
            }
        }
    }

    private suspend fun fallbackNonStreaming(history: List<ChatMessage>, prompt: String) {
        when (val result = repository.sendMessage(history, prompt)) {
            is NetworkResult.Success -> {
                val assistantMsg = ChatMessage(
                    role = MessageRole.assistant,
                    content = result.data
                )
                _uiState.update { state ->
                    state.copy(
                        messages = state.messages + assistantMsg,
                        isLoading = false,
                        error = null,
                        canRetry = false
                    )
                }
                lastFailedUserMessage = null
            }
            is NetworkResult.Error -> {
                handleChatError(result.message)
            }
            is NetworkResult.Loading -> {}
        }
    }

    private fun handleChatError(errorMessage: String) {
        val errorMsg = ChatMessage(
            role = MessageRole.assistant,
            content = errorMessage,
            isError = true
        )
        _uiState.update { state ->
            state.copy(
                messages = state.messages + errorMsg,
                isLoading = false,
                error = errorMessage,
                canRetry = true
            )
        }
    }

    fun retryLastMessage() {
        val lastPrompt = lastFailedUserMessage
        if (lastPrompt != null && !_uiState.value.isLoading) {
            // Remove the trailing error message if any
            val cleanMessages = _uiState.value.messages.filter { !it.isError }
            _uiState.update { it.copy(messages = cleanMessages, error = null, canRetry = false) }
            val historyWithoutLast = if (cleanMessages.isNotEmpty() && cleanMessages.last().role == MessageRole.user) {
                cleanMessages.dropLast(1)
            } else {
                cleanMessages
            }
            executeChatRequest(historyWithoutLast, lastPrompt)
        }
    }

    fun newConversation() {
        activeJob?.cancel()
        _uiState.update { current ->
            current.copy(
                messages = emptyList(),
                inputText = "",
                isLoading = false,
                error = null,
                canRetry = false
            )
        }
        lastFailedUserMessage = null
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun setBackendConfigOpen(open: Boolean) {
        _uiState.update { it.copy(isBackendConfigOpen = open) }
    }

    fun updateBackendUrl(newUrl: String) {
        val app = getApplication<Application>()
        AppConfig.setBackendUrl(app, newUrl)
        _uiState.update { it.copy(backendUrl = AppConfig.getBackendUrl(app), isBackendConfigOpen = false) }
        checkBackendHealth()
    }

    fun resetBackendUrl() {
        val app = getApplication<Application>()
        AppConfig.resetToDefaultBackendUrl(app)
        _uiState.update { it.copy(backendUrl = AppConfig.getBackendUrl(app), isBackendConfigOpen = false) }
        checkBackendHealth()
    }

    fun checkBackendHealth() {
        viewModelScope.launch {
            when (val result = repository.checkBackendHealth()) {
                is NetworkResult.Success -> {
                    _uiState.update { it.copy(apiStatus = result.data) }
                }
                is NetworkResult.Error -> {
                    _uiState.update { it.copy(apiStatus = null) }
                }
                is NetworkResult.Loading -> {}
            }
        }
    }
}
