package ai.meyra.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class FeedbackRequest(
    val type: String,
    val message: String,
    val userEmail: String,
    val userName: String,
    val userId: String,
    val targetEmail: String = "himanshu22maurya22@gmail.com",
    val appVersion: String = "1.0.0",
    val platform: String = "Android",
    val timestamp: Long = System.currentTimeMillis()
)

@Serializable
data class FeedbackResponse(
    val status: String? = null,
    val message: String? = null,
    val error: String? = null
)
