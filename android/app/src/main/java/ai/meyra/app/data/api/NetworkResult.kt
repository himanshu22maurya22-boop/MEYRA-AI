package ai.meyra.app.data.api

sealed class NetworkResult<out T> {
    data class Success<out T>(val data: T) : NetworkResult<T>()
    data class Error(
        val message: String,
        val statusCode: Int? = null,
        val isNetworkError: Boolean = false
    ) : NetworkResult<Nothing>()
    object Loading : NetworkResult<Nothing>()
}
