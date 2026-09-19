package ai.meyra.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowOutward
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.HelpOutline
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ai.meyra.app.data.model.Suggestion
import ai.meyra.app.data.model.SuggestionCategory
import ai.meyra.app.ui.theme.*

@Composable
fun SuggestionCardItem(
    suggestion: Suggestion,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val (icon, iconTint, iconBg) = when (suggestion.category) {
        SuggestionCategory.EXPLAIN -> Triple(
            Icons.Default.HelpOutline,
            MeyraAccentAmber,
            MeyraAccentAmber.copy(alpha = 0.12f)
        )
        SuggestionCategory.WRITE -> Triple(
            Icons.Default.Edit,
            MeyraPrimaryLight,
            MeyraPrimary.copy(alpha = 0.12f)
        )
        SuggestionCategory.CODE -> Triple(
            Icons.Default.Code,
            MeyraAccentPurple,
            MeyraAccentPurple.copy(alpha = 0.12f)
        )
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(MeyraSurface)
            .border(1.dp, MeyraBorder, RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
            .padding(16.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(iconBg),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = iconTint,
                        modifier = Modifier.size(18.dp)
                    )
                }

                Icon(
                    imageVector = Icons.Default.ArrowOutward,
                    contentDescription = null,
                    tint = TextMuted,
                    modifier = Modifier.size(16.dp)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = suggestion.title,
                style = MaterialTheme.typography.titleMedium,
                color = TextPrimary
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = suggestion.description,
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary,
                lineHeight = 16.sp
            )
        }
    }
}
