package ai.meyra.app.data.repository

import android.content.Context
import android.content.SharedPreferences
import ai.meyra.app.data.model.UserProfile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.json.Json
import java.util.UUID

class AuthRepositoryImpl(
    private val context: Context,
    private val json: Json = Json { ignoreUnknownKeys = true }
) : AuthRepository {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("meyra_auth_prefs", Context.MODE_PRIVATE)

    private val _currentUser = MutableStateFlow<UserProfile?>(loadStoredUser())
    override val currentUser: StateFlow<UserProfile?> = _currentUser.asStateFlow()

    private val _isLoggedIn = MutableStateFlow(_currentUser.value != null)
    override val isLoggedIn: StateFlow<Boolean> = _isLoggedIn.asStateFlow()

    private fun loadStoredUser(): UserProfile? {
        val rawJson = prefs.getString(KEY_USER_PROFILE, null) ?: return null
        return try {
            json.decodeFromString(UserProfile.serializer(), rawJson)
        } catch (e: Exception) {
            null
        }
    }

    override suspend fun signInWithGoogle(
        name: String,
        email: String,
        photoUrl: String?
    ): Result<UserProfile> {
        return try {
            val user = UserProfile(
                id = "google_" + UUID.nameUUIDFromBytes(email.lowercase().toByteArray()).toString().take(12),
                name = name.ifBlank { email.substringBefore("@").replaceFirstChar { it.uppercase() } },
                email = email.trim().lowercase(),
                photoUrl = photoUrl,
                authProvider = "google"
            )
            saveUser(user)
            Result.success(user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun createAccount(name: String, email: String): Result<UserProfile> {
        return try {
            val user = UserProfile(
                id = "meyra_" + UUID.randomUUID().toString().take(10),
                name = name.trim(),
                email = email.trim().lowercase(),
                photoUrl = null,
                authProvider = "account"
            )
            saveUser(user)
            Result.success(user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun signOut() {
        prefs.edit().remove(KEY_USER_PROFILE).apply()
        _currentUser.value = null
        _isLoggedIn.value = false
    }

    private fun saveUser(user: UserProfile) {
        val serialized = json.encodeToString(UserProfile.serializer(), user)
        prefs.edit().putString(KEY_USER_PROFILE, serialized).apply()
        _currentUser.value = user
        _isLoggedIn.value = true
    }

    companion object {
        private const val KEY_USER_PROFILE = "current_user_profile"

        @Volatile
        private var INSTANCE: AuthRepositoryImpl? = null

        fun getInstance(context: Context): AuthRepositoryImpl {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: AuthRepositoryImpl(context.applicationContext).also { INSTANCE = it }
            }
        }
    }
}
