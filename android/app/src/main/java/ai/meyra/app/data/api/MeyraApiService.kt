package ai.meyra.app.data.api

import ai.meyra.app.data.model.ApiStatusResponse
import ai.meyra.app.data.model.ChatRequest
import ai.meyra.app.data.model.ChatResponse
import ai.meyra.app.data.model.FeedbackRequest
import ai.meyra.app.data.model.FeedbackResponse
import ai.meyra.app.data.model.StreamChunk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.BufferedReader
import java.io.IOException
import java.io.InputStreamReader
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.util.concurrent.TimeUnit

class MeyraApiService(
    private val baseUrlProvider: () -> String
) {
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
    }

    private val mediaTypeJson = "application/json; charset=utf-8".toMediaType()

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    /**
     * Non-streaming call to POST /api/chat
     */
    suspend fun sendChat(requestPayload: ChatRequest): NetworkResult<ChatResponse> = withContext(Dispatchers.IO) {
        val baseUrl = baseUrlProvider()
        val url = "$baseUrl/api/chat"
        val bodyString = json.encodeToString(ChatRequest.serializer(), requestPayload.copy(stream = false))
        val body = bodyString.toRequestBody(mediaTypeJson)

        val request = Request.Builder()
            .url(url)
            .post(body)
            .addHeader("Content-Type", "application/json")
            .addHeader("Accept", "application/json")
            .build()

        try {
            client.newCall(request).execute().use { response ->
                val responseBody = response.body?.string().orEmpty()

                if (response.isSuccessful) {
                    try {
                        val parsed = json.decodeFromString(ChatResponse.serializer(), responseBody)
                        if (parsed.error != null) {
                            return@withContext NetworkResult.Error(
                                message = parsed.error,
                                statusCode = response.code
                            )
                        }
                        NetworkResult.Success(parsed)
                    } catch (e: Exception) {
                        NetworkResult.Error(
                            message = "Failed to parse backend response: ${e.localizedMessage}",
                            statusCode = response.code
                        )
                    }
                } else {
                    val errorMessage = parseErrorMessage(response.code, responseBody)
                    NetworkResult.Error(
                        message = errorMessage,
                        statusCode = response.code
                    )
                }
            }
        } catch (e: Exception) {
            handleException(e)
        }
    }

    /**
     * SSE Streaming call to POST /api/chat returning real-time Flow of tokens.
     */
    fun sendChatStream(requestPayload: ChatRequest): Flow<NetworkResult<String>> = flow {
        val baseUrl = baseUrlProvider()
        val url = "$baseUrl/api/chat"
        val bodyString = json.encodeToString(ChatRequest.serializer(), requestPayload.copy(stream = true))
        val body = bodyString.toRequestBody(mediaTypeJson)

        val request = Request.Builder()
            .url(url)
            .post(body)
            .addHeader("Content-Type", "application/json")
            .addHeader("Accept", "text/event-stream")
            .build()

        try {
            val response = client.newCall(request).execute()
            if (!response.isSuccessful) {
                val errorBody = response.body?.string().orEmpty()
                val errorMsg = parseErrorMessage(response.code, errorBody)
                emit(NetworkResult.Error(errorMsg, response.code))
                response.close()
                return@flow
            }

            val contentType = response.header("Content-Type").orEmpty()
            if (contentType.contains("application/json")) {
                val responseBody = response.body?.string().orEmpty()
                try {
                    val parsed = json.decodeFromString(ChatResponse.serializer(), responseBody)
                    if (parsed.error != null) {
                        emit(NetworkResult.Error(parsed.error, response.code))
                    } else if (!parsed.content.isNullOrEmpty()) {
                        emit(NetworkResult.Success(parsed.content))
                    }
                } catch (e: Exception) {
                    emit(NetworkResult.Error("Failed to parse response: ${e.localizedMessage}"))
                }
                response.close()
                return@flow
            }

            val inputStream = response.body?.byteStream()
            if (inputStream == null) {
                emit(NetworkResult.Error("Empty response stream received from backend"))
                response.close()
                return@flow
            }

            val reader = BufferedReader(InputStreamReader(inputStream, Charsets.UTF_8))
            var line: String?

            while (reader.readLine().also { line = it } != null) {
                val currentLine = line?.trim().orEmpty()
                if (currentLine.startsWith("data:")) {
                    val dataContent = currentLine.removePrefix("data:").trim()
                    if (dataContent.isEmpty() || dataContent == "[DONE]") continue

                    try {
                        val chunk = json.decodeFromString(StreamChunk.serializer(), dataContent)
                        if (chunk.error != null) {
                            emit(NetworkResult.Error(chunk.error))
                            break
                        }
                        if (!chunk.text.isNullOrEmpty()) {
                            emit(NetworkResult.Success(chunk.text))
                        }
                        if (chunk.done) {
                            break
                        }
                    } catch (e: Exception) {
                        emit(NetworkResult.Success(dataContent))
                    }
                }
            }

            response.close()
        } catch (e: Exception) {
            emit(handleException(e))
        }
    }.flowOn(Dispatchers.IO)

    /**
     * Health check to GET /api/status
     */
    suspend fun checkStatus(): NetworkResult<ApiStatusResponse> = withContext(Dispatchers.IO) {
        val baseUrl = baseUrlProvider()
        val url = "$baseUrl/api/status"

        val request = Request.Builder()
            .url(url)
            .get()
            .addHeader("Accept", "application/json")
            .build()

        try {
            client.newCall(request).execute().use { response ->
                val responseBody = response.body?.string().orEmpty()
                if (response.isSuccessful) {
                    val parsed = json.decodeFromString(ApiStatusResponse.serializer(), responseBody)
                    NetworkResult.Success(parsed)
                } else {
                    NetworkResult.Error(
                        message = "Status check returned HTTP ${response.code}",
                        statusCode = response.code
                    )
                }
            }
        } catch (e: Exception) {
            handleException(e)
        }
    }

    /**
     * Submit user feedback or bug report to POST /api/feedback
     */
    suspend fun sendFeedback(payload: FeedbackRequest): NetworkResult<FeedbackResponse> = withContext(Dispatchers.IO) {
        val baseUrl = baseUrlProvider()
        val url = "$baseUrl/api/feedback"
        val bodyString = json.encodeToString(FeedbackRequest.serializer(), payload)
        val body = bodyString.toRequestBody(mediaTypeJson)

        val request = Request.Builder()
            .url(url)
            .post(body)
            .addHeader("Content-Type", "application/json")
            .addHeader("Accept", "application/json")
            .build()

        try {
            client.newCall(request).execute().use { response ->
                val responseBody = response.body?.string().orEmpty()
                if (response.isSuccessful) {
                    try {
                        val parsed = json.decodeFromString(FeedbackResponse.serializer(), responseBody)
                        NetworkResult.Success(parsed)
                    } catch (e: Exception) {
                        NetworkResult.Success(FeedbackResponse(status = "ok", message = "Feedback submitted successfully"))
                    }
                } else {
                    NetworkResult.Error(
                        message = "Feedback submission failed (HTTP ${response.code})",
                        statusCode = response.code
                    )
                }
            }
        } catch (e: Exception) {
            handleException(e)
        }
    }

    private fun parseErrorMessage(statusCode: Int, body: String): String {
        return try {
            val parsed = json.decodeFromString(ChatResponse.serializer(), body)
            parsed.error ?: when (statusCode) {
                401 -> "Authentication error with backend API service [401]."
                403 -> "Access forbidden [403]. Please verify backend credentials."
                404 -> "MEYRA AI chat endpoint not found [404] on backend: $baseUrlProvider"
                429 -> "Resource rate limit reached [429]. Please wait a moment and retry."
                500 -> "MEYRA AI backend internal server error [500]."
                503 -> "AI service temporarily unavailable [503]."
                else -> "Backend error (HTTP $statusCode)."
            }
        } catch (_: Exception) {
            when (statusCode) {
                401 -> "Authentication required [401]."
                404 -> "Endpoint /api/chat not found [404]."
                429 -> "Rate limited [429]. Please retry shortly."
                500 -> "Backend server error [500]."
                else -> "Server returned error $statusCode."
            }
        }
    }

    private fun <T> handleException(e: Exception): NetworkResult<T> {
        return when (e) {
            is UnknownHostException -> NetworkResult.Error(
                message = "Cannot resolve backend host. Check your internet connection or backend URL.",
                isNetworkError = true
            )
            is ConnectException -> NetworkResult.Error(
                message = "Unable to connect to MEYRA AI backend. Make sure the server is online.",
                isNetworkError = true
            )
            is SocketTimeoutException -> NetworkResult.Error(
                message = "Request timed out waiting for MEYRA AI response. Please retry.",
                isNetworkError = true
            )
            is IOException -> NetworkResult.Error(
                message = "Network error: ${e.localizedMessage ?: "Connection interrupted"}",
                isNetworkError = true
            )
            else -> NetworkResult.Error(
                message = "Unexpected error: ${e.localizedMessage ?: "Unknown failure"}"
            )
        }
    }
}
