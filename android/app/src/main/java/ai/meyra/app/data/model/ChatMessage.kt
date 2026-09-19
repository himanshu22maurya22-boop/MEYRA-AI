package ai.meyra.app.data.model

import kotlinx.serialization.Serializable
import java.util.UUID

/**
 * Message model representing a single turn in a conversation.
 */
@Serializable
data class ChatMessage(
    val id: String = UUID.randomUUID().toString(),
    val role: MessageRole,
    val content: String,
    val timestamp: Long = System.currentTimeMillis(),
    val isError: Boolean = false,
    val isStreaming: Boolean = false
)

@Serializable
enum class MessageRole {
    user,
    assistant,
    system
}
