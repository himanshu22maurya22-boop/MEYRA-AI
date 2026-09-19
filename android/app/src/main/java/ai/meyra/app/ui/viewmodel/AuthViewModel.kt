package ai.meyra.app.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import ai.meyra.app.data.model.UserProfile
import ai.meyra.app.data.repository.AuthRepository
import ai.meyra.app.data.repository.AuthRepositoryImpl
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AuthUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null
)

class AuthViewModel(
    application: Application,
    private val authRepository: AuthRepository = AuthRepositoryImpl.getInstance(application)
) : AndroidViewModel(application) {

    val currentUser: StateFlow<UserProfile?> = authRepository.currentUser
    val isLoggedIn: StateFlow<Boolean> = authRepository.isLoggedIn

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    fun signInWithGoogle(name: String, email: String, photoUrl: String? = null) {
        if (email.isBlank() || !email.contains("@")) {
            _uiState.value = _uiState.value.copy(error = "Please enter a valid Google email address.")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            val result = authRepository.signInWithGoogle(name, email, photoUrl)
            result.onSuccess {
                _uiState.value = AuthUiState(successMessage = "Signed in successfully as ${it.name}")
            }.onFailure {
                _uiState.value = AuthUiState(error = it.localizedMessage ?: "Failed to sign in with Google")
            }
        }
    }

    fun createAccount(name: String, email: String) {
        if (name.isBlank()) {
            _uiState.value = _uiState.value.copy(error = "Please enter your name.")
            return
        }
        if (email.isBlank() || !email.contains("@")) {
            _uiState.value = _uiState.value.copy(error = "Please enter a valid email address.")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            val result = authRepository.createAccount(name, email)
            result.onSuccess {
                _uiState.value = AuthUiState(successMessage = "Welcome, ${it.name}!")
            }.onFailure {
                _uiState.value = AuthUiState(error = it.localizedMessage ?: "Failed to create account")
            }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            authRepository.signOut()
            _uiState.value = AuthUiState()
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
}
