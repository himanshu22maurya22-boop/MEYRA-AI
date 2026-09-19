package ai.meyra.app.data.repository

import ai.meyra.app.data.api.NetworkResult
import ai.meyra.app.data.model.ApiStatusResponse
import ai.meyra.app.data.model.ChatMessage
import ai.meyra.app.data.model.FeedbackRequest
import ai.meyra.app.data.model.FeedbackResponse
import kotlinx.coroutines.flow.Flow

interface ChatRepository {
    suspend fun sendMessage(
        history: List<ChatMessage>,
        userMessage: String,
        systemPrompt: String? = null
    ): NetworkResult<String>

    fun streamMessage(
        history: List<ChatMessage>,
        userMessage: String,
        systemPrompt: String? = null
    ): Flow<NetworkResult<String>>

    suspend fun checkBackendHealth(): NetworkResult<ApiStatusResponse>

    suspend fun sendFeedback(
        feedback: FeedbackRequest
    ): NetworkResult<FeedbackResponse>
}
