package ai.meyra.app.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val DarkColorScheme = darkColorScheme(
    primary = MeyraPrimary,
    onPrimary = TextPrimary,
    primaryContainer = MeyraPrimaryVariant,
    onPrimaryContainer = TextPrimary,
    secondary = MeyraPrimaryLight,
    onSecondary = MeyraBackground,
    background = MeyraBackground,
    onBackground = TextPrimary,
    surface = MeyraSurface,
    onSurface = TextPrimary,
    surfaceVariant = MeyraSurfaceVariant,
    onSurfaceVariant = TextSecondary,
    outline = MeyraBorder,
    error = MeyraError,
    onError = TextPrimary,
    errorContainer = MeyraErrorBackground,
    onErrorContainer = TextPrimary
)

@Composable
fun MeyraAITheme(
    // Default to dark theme as requested for futuristic MEYRA AI branding
    darkTheme: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = DarkColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = MeyraBackground.toArgb()
            window.navigationBarColor = MeyraBackground.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
            WindowCompat.getInsetsController(window, view).isAppearanceLightNavigationBars = false
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
