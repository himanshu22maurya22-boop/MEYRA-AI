package ai.meyra.app

import android.app.Application
import ai.meyra.app.config.AppConfig
import ai.meyra.app.data.api.MeyraApiService
import ai.meyra.app.data.repository.ChatRepository
import ai.meyra.app.data.repository.ChatRepositoryImpl

class MeyraApplication : Application() {

    lateinit var apiService: MeyraApiService
        private set

    lateinit var chatRepository: ChatRepository
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this

        apiService = MeyraApiService(
            baseUrlProvider = { AppConfig.getBackendUrl(this) }
        )
        chatRepository = ChatRepositoryImpl(apiService)
    }

    companion object {
        lateinit var instance: MeyraApplication
            private set
    }
}
