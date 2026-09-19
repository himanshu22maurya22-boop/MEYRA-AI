package ai.meyra.app.data.model

import kotlinx.serialization.Serializable

/**
 * Payload sent to POST /api/chat matching the MEYRA AI backend schema.
 */
@Serializable
data class ChatRequest(
    val messages: List<ApiMessageItem>,
    val stream: Boolean = false,
    val systemPrompt: String? = null,
    val temperature: Double? = null,
    val model: String? = null
)

@Serializable
data class ApiMessageItem(
    val role: String,
    val content: String
)

/**
 * Response received from non-streaming POST /api/chat.
 */
@Serializable
data class ChatResponse(
    val role: String? = null,
    val content: String? = null,
    val error: String? = null,
    val code: String? = null
)

/**
 * Stream event parsed from SSE lines (e.g. data: {"text":"...", "done":false})
 */
@Serializable
data class StreamChunk(
    val text: String? = null,
    val error: String? = null,
    val done: Boolean = false
)
