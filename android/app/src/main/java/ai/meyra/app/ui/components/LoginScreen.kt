package ai.meyra.app.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Security
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ai.meyra.app.R
import ai.meyra.app.ui.theme.MeyraBackground
import ai.meyra.app.ui.theme.MeyraBorder
import ai.meyra.app.ui.theme.MeyraCard
import ai.meyra.app.ui.theme.MeyraPrimary
import ai.meyra.app.ui.theme.MeyraSecondary
import ai.meyra.app.ui.theme.MeyraSurface
import ai.meyra.app.ui.theme.MeyraTextMuted
import ai.meyra.app.ui.theme.MeyraTextPrimary
import ai.meyra.app.ui.theme.MeyraTextSecondary
import ai.meyra.app.ui.viewmodel.AuthViewModel

enum class AuthTab {
    GOOGLE, CREATE_ACCOUNT
}

@Composable
fun LoginScreen(
    authViewModel: AuthViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by authViewModel.uiState.collectAsState()
    var selectedTab by remember { mutableStateOf(AuthTab.GOOGLE) }

    // Google Sign-In Fields
    var googleEmail by remember { mutableStateOf("") }
    var googleName by remember { mutableStateOf("") }

    // Account Creation Fields
    var accountName by remember { mutableStateOf("") }
    var accountEmail by remember { mutableStateOf("") }

    val focusManager = LocalFocusManager.current
    val scrollState = rememberScrollState()

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MeyraBackground)
            .padding(horizontal = 24.dp)
            .verticalScroll(scrollState),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Ambient Brand Glow & Emblem
            Box(
                modifier = Modifier
                    .size(96.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(
                        Brush.radialGradient(
                            colors = listOf(
                                MeyraPrimary.copy(alpha = 0.35f),
                                Color(0xFF0F0F18)
                            )
                        )
                    )
                    .border(
                        width = 1.5.dp,
                        brush = Brush.linearGradient(
                            listOf(MeyraPrimary, MeyraSecondary)
                        ),
                        shape = RoundedCornerShape(24.dp)
                    )
                    .shadow(16.dp, RoundedCornerShape(24.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    painter = painterResource(id = R.drawable.ic_meyra_logo),
                    contentDescription = "MEYRA AI Logo",
                    tint = Color.Unspecified,
                    modifier = Modifier.size(54.dp)
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Brand Typography
            Text(
                text = "MEYRA AI",
                color = MeyraTextPrimary,
                fontSize = 28.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = 1.5.sp
            )

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = "Your Intelligent AI Companion",
                color = MeyraTextSecondary,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Auth Tab Switcher
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(MeyraSurface)
                    .border(1.dp, MeyraBorder, RoundedCornerShape(12.dp))
                    .padding(4.dp)
            ) {
                // Tab: Google Login
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(10.dp))
                        .background(
                            if (selectedTab == AuthTab.GOOGLE) MeyraCard else Color.Transparent
                        )
                        .clickable {
                            selectedTab = AuthTab.GOOGLE
                            authViewModel.clearError()
                        }
                        .padding(vertical = 10.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Google Sign In",
                        color = if (selectedTab == AuthTab.GOOGLE) MeyraTextPrimary else MeyraTextMuted,
                        fontSize = 13.sp,
                        fontWeight = if (selectedTab == AuthTab.GOOGLE) FontWeight.SemiBold else FontWeight.Normal
                    )
                }

                // Tab: Create Account
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(10.dp))
                        .background(
                            if (selectedTab == AuthTab.CREATE_ACCOUNT) MeyraCard else Color.Transparent
                        )
                        .clickable {
                            selectedTab = AuthTab.CREATE_ACCOUNT
                            authViewModel.clearError()
                        }
                        .padding(vertical = 10.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Create Profile",
                        color = if (selectedTab == AuthTab.CREATE_ACCOUNT) MeyraTextPrimary else MeyraTextMuted,
                        fontSize = 13.sp,
                        fontWeight = if (selectedTab == AuthTab.CREATE_ACCOUNT) FontWeight.SemiBold else FontWeight.Normal
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Error Message Banner
            AnimatedVisibility(visible = uiState.error != null) {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp),
                    color = Color(0xFF3F151B),
                    shape = RoundedCornerShape(10.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEF4444).copy(alpha = 0.5f))
                ) {
                    Text(
                        text = uiState.error ?: "",
                        color = Color(0xFFFCA5A5),
                        fontSize = 13.sp,
                        modifier = Modifier.padding(12.dp),
                        textAlign = TextAlign.Center
                    )
                }
            }

            if (selectedTab == AuthTab.GOOGLE) {
                // GOOGLE SIGN-IN TAB
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = "Sign in with your Google Account to sync conversations and preferences across devices.",
                        color = MeyraTextMuted,
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center,
                        lineHeight = 18.sp,
                        modifier = Modifier.padding(bottom = 20.dp)
                    )

                    OutlinedTextField(
                        value = googleName,
                        onValueChange = { googleName = it },
                        label = { Text("Display Name") },
                        placeholder = { Text("e.g. Alex Maurya") },
                        leadingIcon = {
                            Icon(Icons.Default.Person, contentDescription = null, tint = MeyraTextMuted)
                        },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = MeyraPrimary,
                            unfocusedBorderColor = MeyraBorder,
                            focusedContainerColor = MeyraSurface,
                            unfocusedContainerColor = MeyraSurface,
                            focusedTextColor = MeyraTextPrimary,
                            unfocusedTextColor = MeyraTextPrimary
                        ),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = googleEmail,
                        onValueChange = { googleEmail = it },
                        label = { Text("Google / Gmail Address") },
                        placeholder = { Text("username@gmail.com") },
                        leadingIcon = {
                            Icon(Icons.Default.Email, contentDescription = null, tint = MeyraTextMuted)
                        },
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Email,
                            imeAction = ImeAction.Done
                        ),
                        keyboardActions = KeyboardActions(
                            onDone = {
                                focusManager.clearFocus()
                                authViewModel.signInWithGoogle(googleName, googleEmail)
                            }
                        ),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = MeyraPrimary,
                            unfocusedBorderColor = MeyraBorder,
                            focusedContainerColor = MeyraSurface,
                            unfocusedContainerColor = MeyraSurface,
                            focusedTextColor = MeyraTextPrimary,
                            unfocusedTextColor = MeyraTextPrimary
                        ),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )

                    Spacer(modifier = Modifier.height(20.dp))

                    // Continue with Google Button
                    Button(
                        onClick = {
                            focusManager.clearFocus()
                            val email = if (googleEmail.isNotBlank()) googleEmail else "user@gmail.com"
                            val name = if (googleName.isNotBlank()) googleName else "MEYRA Explorer"
                            authViewModel.signInWithGoogle(name, email)
                        },
                        enabled = !uiState.isLoading,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color.White,
                            contentColor = Color(0xFF1F1F1F)
                        ),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        if (uiState.isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = Color(0xFF1F1F1F),
                                strokeWidth = 2.dp
                            )
                        } else {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center
                            ) {
                                // Google Colorful "G" Style Circle
                                Box(
                                    modifier = Modifier
                                        .size(22.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFF4285F4)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = "G",
                                        color = Color.White,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Text(
                                    text = "Continue with Google",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // One-tap quick demo sign-in
                    TextButton(
                        onClick = {
                            authViewModel.signInWithGoogle(
                                name = "Alex",
                                email = "alex@gmail.com",
                                photoUrl = null
                            )
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "Quick Demo Sign In (1-Tap)",
                            color = MeyraTextSecondary,
                            fontSize = 13.sp
                        )
                    }
                }
            } else {
                // CREATE ACCOUNT / PROFILE TAB
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = "Create your personalized MEYRA AI profile to customize your experience.",
                        color = MeyraTextMuted,
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center,
                        lineHeight = 18.sp,
                        modifier = Modifier.padding(bottom = 20.dp)
                    )

                    OutlinedTextField(
                        value = accountName,
                        onValueChange = { accountName = it },
                        label = { Text("Your Full Name") },
                        placeholder = { Text("e.g. Himanshu Maurya") },
                        leadingIcon = {
                            Icon(Icons.Default.Person, contentDescription = null, tint = MeyraTextMuted)
                        },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = MeyraPrimary,
                            unfocusedBorderColor = MeyraBorder,
                            focusedContainerColor = MeyraSurface,
                            unfocusedContainerColor = MeyraSurface,
                            focusedTextColor = MeyraTextPrimary,
                            unfocusedTextColor = MeyraTextPrimary
                        ),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = accountEmail,
                        onValueChange = { accountEmail = it },
                        label = { Text("Email Address") },
                        placeholder = { Text("e.g. himanshu@example.com") },
                        leadingIcon = {
                            Icon(Icons.Default.Email, contentDescription = null, tint = MeyraTextMuted)
                        },
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Email,
                            imeAction = ImeAction.Done
                        ),
                        keyboardActions = KeyboardActions(
                            onDone = {
                                focusManager.clearFocus()
                                authViewModel.createAccount(accountName, accountEmail)
                            }
                        ),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = MeyraPrimary,
                            unfocusedBorderColor = MeyraBorder,
                            focusedContainerColor = MeyraSurface,
                            unfocusedContainerColor = MeyraSurface,
                            focusedTextColor = MeyraTextPrimary,
                            unfocusedTextColor = MeyraTextPrimary
                        ),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )

                    Spacer(modifier = Modifier.height(20.dp))

                    Button(
                        onClick = {
                            focusManager.clearFocus()
                            authViewModel.createAccount(accountName, accountEmail)
                        },
                        enabled = !uiState.isLoading,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MeyraPrimary,
                            contentColor = Color.White
                        ),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        if (uiState.isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center
                            ) {
                                Text(
                                    text = "Create Profile & Get Started",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Icon(
                                    imageVector = Icons.Default.ArrowForward,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            // Security Directives & Privacy badge
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center,
                modifier = Modifier.padding(horizontal = 8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Security,
                    contentDescription = null,
                    tint = MeyraTextMuted,
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "End-to-End Encrypted • No passwords stored • HTTPS",
                    color = MeyraTextMuted,
                    fontSize = 11.sp,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}
