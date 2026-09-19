package ai.meyra.app.data.repository

import ai.meyra.app.config.AppConfig
import ai.meyra.app.data.api.MeyraApiService
import ai.meyra.app.data.api.NetworkResult
import ai.meyra.app.data.model.ApiMessageItem
import ai.meyra.app.data.model.ApiStatusResponse
import ai.meyra.app.data.model.ChatMessage
import ai.meyra.app.data.model.ChatRequest
import ai.meyra.app.data.model.FeedbackRequest
import ai.meyra.app.data.model.FeedbackResponse
import ai.meyra.app.data.model.MessageRole
import kotlinx.coroutines.flow.Flow

class ChatRepositoryImpl(
    private val apiService: MeyraApiService
) : ChatRepository {

    override suspend fun sendMessage(
        history: List<ChatMessage>,
        userMessage: String,
        systemPrompt: String?
    ): NetworkResult<String> {
        val messagesPayload = buildPayload(history, userMessage)
        val request = ChatRequest(
            messages = messagesPayload,
            stream = false,
            systemPrompt = systemPrompt ?: AppConfig.MEYRA_SYSTEM_PROMPT
        )

        return when (val result = apiService.sendChat(request)) {
            is NetworkResult.Success -> {
                val text = result.data.content.orEmpty()
                if (text.isNotBlank()) {
                    NetworkResult.Success(text)
                } else {
                    NetworkResult.Error("Received empty response from MEYRA AI.")
                }
            }
            is NetworkResult.Error -> NetworkResult.Error(
                message = result.message,
                statusCode = result.statusCode,
                isNetworkError = result.isNetworkError
            )
            is NetworkResult.Loading -> NetworkResult.Loading
        }
    }

    override fun streamMessage(
        history: List<ChatMessage>,
        userMessage: String,
        systemPrompt: String?
    ): Flow<NetworkResult<String>> {
        val messagesPayload = buildPayload(history, userMessage)
        val request = ChatRequest(
            messages = messagesPayload,
            stream = true,
            systemPrompt = systemPrompt ?: AppConfig.MEYRA_SYSTEM_PROMPT
        )
        return apiService.sendChatStream(request)
    }

    override suspend fun checkBackendHealth(): NetworkResult<ApiStatusResponse> {
        return apiService.checkStatus()
    }

    override suspend fun sendFeedback(
        feedback: FeedbackRequest
    ): NetworkResult<FeedbackResponse> {
        return apiService.sendFeedback(feedback)
    }

    private fun buildPayload(history: List<ChatMessage>, userMessage: String): List<ApiMessageItem> {
        val items = mutableListOf<ApiMessageItem>()

        // Include valid previous context
        history.filter { !it.isError && it.content.isNotBlank() }.forEach { msg ->
            val roleStr = when (msg.role) {
                MessageRole.user -> "user"
                MessageRole.assistant -> "assistant"
                MessageRole.system -> "system"
            }
            items.add(ApiMessageItem(role = roleStr, content = msg.content))
        }

        // Add current user prompt
        items.add(ApiMessageItem(role = "user", content = userMessage))
        return items
    }
}
