package ai.meyra.app.data.repository

import ai.meyra.app.data.model.UserProfile
import kotlinx.coroutines.flow.StateFlow

interface AuthRepository {
    val currentUser: StateFlow<UserProfile?>
    val isLoggedIn: StateFlow<Boolean>

    suspend fun signInWithGoogle(name: String, email: String, photoUrl: String? = null): Result<UserProfile>
    suspend fun createAccount(name: String, email: String): Result<UserProfile>
    suspend fun signOut()
}
