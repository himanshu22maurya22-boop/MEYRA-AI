package ai.meyra.app.ui.viewmodel

import ai.meyra.app.data.model.ApiStatusResponse
import ai.meyra.app.data.model.ChatMessage

data class ChatUiState(
    val messages: List<ChatMessage> = emptyList(),
    val inputText: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val canRetry: Boolean = false,
    val backendUrl: String = "",
    val isBackendConfigOpen: Boolean = false,
    val apiStatus: ApiStatusResponse? = null
) {
    val isConversationEmpty: Boolean
        get() = messages.isEmpty()

    val canSend: Boolean
        get() = inputText.isNotBlank() && !isLoading
}
