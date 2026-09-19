package ai.meyra.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.animation.Crossfade
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import ai.meyra.app.ui.components.ChatScreen
import ai.meyra.app.ui.components.LoginScreen
import ai.meyra.app.ui.theme.MeyraAITheme
import ai.meyra.app.ui.theme.MeyraBackground
import ai.meyra.app.ui.viewmodel.AuthViewModel
import ai.meyra.app.ui.viewmodel.ChatViewModel

class MainActivity : ComponentActivity() {

    private val chatViewModel: ChatViewModel by viewModels()
    private val authViewModel: AuthViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val isLoggedIn by authViewModel.isLoggedIn.collectAsState()

            MeyraAITheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MeyraBackground
                ) {
                    Crossfade(
                        targetState = isLoggedIn,
                        label = "AuthCrossfade"
                    ) { loggedIn ->
                        if (loggedIn) {
                            ChatScreen(
                                viewModel = chatViewModel,
                                authViewModel = authViewModel
                            )
                        } else {
                            LoginScreen(
                                authViewModel = authViewModel
                            )
                        }
                    }
                }
            }
        }
    }
}
