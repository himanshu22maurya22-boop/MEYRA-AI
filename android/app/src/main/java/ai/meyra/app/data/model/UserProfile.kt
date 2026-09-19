package ai.meyra.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class UserProfile(
    val id: String,
    val name: String,
    val email: String,
    val photoUrl: String? = null,
    val authProvider: String = "google",
    val createdAt: Long = System.currentTimeMillis()
)
