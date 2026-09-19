package ai.meyra.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class ApiStatusResponse(
    val status: String? = null,
    val appName: String? = null,
    val version: String? = null,
    val isConfigured: Boolean = false,
    val model: String? = null,
    val message: String? = null,
    val timestamp: String? = null
)
