package ai.meyra.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import ai.meyra.app.ui.theme.MeyraBackground
import ai.meyra.app.ui.viewmodel.AuthViewModel
import ai.meyra.app.ui.viewmodel.ChatViewModel

@Composable
fun ChatScreen(
    viewModel: ChatViewModel,
    authViewModel: AuthViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val currentUser by authViewModel.currentUser.collectAsState()
    val listState = rememberLazyListState()

    var showSettingsDialog by remember { mutableStateOf(false) }
    var showFeedbackDialog by remember { mutableStateOf(false) }
    var showAboutDialog by remember { mutableStateOf(false) }
    var showVoiceDialog by remember { mutableStateOf(false) }

    // Automatically scroll to bottom when messages list size or content updates
    LaunchedEffect(uiState.messages.size, uiState.isLoading) {
        if (uiState.messages.isNotEmpty()) {
            listState.animateScrollToItem(uiState.messages.size - 1)
        }
    }

    // Also smoothly scroll when streaming content chunks arrive
    val lastMessageContentLength = uiState.messages.lastOrNull()?.content?.length ?: 0
    LaunchedEffect(lastMessageContentLength) {
        if (uiState.messages.isNotEmpty() && listState.canScrollForward) {
            listState.scrollToItem(uiState.messages.size - 1)
        }
    }

    Scaffold(
        topBar = {
            MeyraTopBar(
                onNewChat = { viewModel.newConversation() },
                onOpenSettings = { showSettingsDialog = true },
                hasMessages = !uiState.isConversationEmpty
            )
        },
        bottomBar = {
            MessageInputBar(
                value = uiState.inputText,
                onValueChange = { viewModel.onInputChanged(it) },
                onSend = { viewModel.sendMessage() },
                isLoading = uiState.isLoading,
                onOpenVoiceInput = { showVoiceDialog = true }
            )
        },
        containerColor = MeyraBackground,
        modifier = modifier.fillMaxSize()
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(MeyraBackground)
        ) {
            if (uiState.isConversationEmpty) {
                // Home Screen State with Brand Hero, 3 Suggestion Cards & Creator Attribution
                HomeScreen(
                    onSelectSuggestion = { suggestion ->
                        viewModel.selectSuggestion(suggestion)
                    },
                    onOpenAbout = { showAboutDialog = true },
                    modifier = Modifier.fillMaxSize()
                )
            } else {
                // Active Chat Screen with Messages List (Right for User, Left for MEYRA AI)
                LazyColumn(
                    state = listState,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(bottom = 8.dp),
                    contentPadding = PaddingValues(vertical = 12.dp)
                ) {
                    items(
                        items = uiState.messages,
                        key = { it.id }
                    ) { message ->
                        MessageBubble(
                            message = message,
                            onRetry = { viewModel.retryLastMessage() }
                        )
                    }

                    // Typing / Thinking indicator while AI request is in-flight before first token
                    if (uiState.isLoading && uiState.messages.none { it.isStreaming }) {
                        item(key = "typing_indicator") {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(start = 16.dp, top = 8.dp, bottom = 8.dp)
                            ) {
                                TypingIndicator()
                            }
                        }
                    }
                }
            }
        }
    }

    // Comprehensive Settings & Account Profile Dialog
    if (showSettingsDialog) {
        SettingsDialog(
            userProfile = currentUser,
            currentBackendUrl = uiState.backendUrl,
            apiStatus = uiState.apiStatus,
            onSaveBackendUrl = { newUrl ->
                viewModel.updateBackendUrl(newUrl)
            },
            onResetBackendUrl = {
                viewModel.resetBackendUrl()
            },
            onOpenFeedback = {
                showSettingsDialog = false
                showFeedbackDialog = true
            },
            onOpenAbout = {
                showSettingsDialog = false
                showAboutDialog = true
            },
            onLogout = {
                showSettingsDialog = false
                authViewModel.signOut()
            },
            onDismiss = {
                showSettingsDialog = false
            }
        )
    }

    // Feedback & Bug Report Dialog
    if (showFeedbackDialog) {
        FeedbackDialog(
            userProfile = currentUser,
            chatRepository = viewModel.chatRepository,
            onDismiss = { showFeedbackDialog = false }
        )
    }

    // About MEYRA AI Dialog (Founder & Creator Information)
    if (showAboutDialog) {
        AboutDialog(
            onDismiss = { showAboutDialog = false }
        )
    }

    // Real Native Android Voice Input Dialog
    if (showVoiceDialog) {
        VoiceInputDialog(
            onDismiss = { showVoiceDialog = false },
            onTranscriptionComplete = { recognizedText ->
                val existing = uiState.inputText.trim()
                val newText = if (existing.isEmpty()) recognizedText else "$existing $recognizedText"
                viewModel.onInputChanged(newText)
            }
        )
    }
}
