package ai.meyra.app.ui.components

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ai.meyra.app.ui.theme.*

/**
 * Parses markdown text into formatted Jetpack Compose blocks (Code Blocks, Inline Code, Bold, Lists, Plain Text).
 */
@Composable
fun FormattedText(
    text: String,
    modifier: Modifier = Modifier,
    textColor: Color = TextPrimary
) {
    val context = LocalContext.current
    val sections = remember(text) { parseMarkdownIntoSections(text) }

    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        for (section in sections) {
            when (section) {
                is TextSection.CodeBlock -> {
                    CodeBlock(
                        code = section.code,
                        language = section.language,
                        onCopy = {
                            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                            clipboard.setPrimaryClip(ClipData.newPlainText("Code", section.code))
                            Toast.makeText(context, "Code copied to clipboard", Toast.LENGTH_SHORT).show()
                        }
                    )
                }
                is TextSection.Paragraph -> {
                    Text(
                        text = buildFormattedAnnotatedString(section.text, textColor),
                        style = MaterialTheme.typography.bodyLarge,
                        color = textColor,
                        lineHeight = 22.sp
                    )
                }
            }
        }
    }
}

@Composable
fun CodeBlock(
    code: String,
    language: String?,
    onCopy: () -> Unit
) {
    var copied by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(CodeBlockBackground)
            .border(1.dp, MeyraBorder, RoundedCornerShape(12.dp))
    ) {
        // Code Block Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(MeyraSurface)
                .padding(horizontal = 12.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = (language ?: "code").uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = MeyraPrimaryLight,
                fontWeight = FontWeight.Bold
            )

            IconButton(
                onClick = {
                    copied = true
                    onCopy()
                },
                modifier = Modifier.size(28.dp)
            ) {
                Icon(
                    imageVector = if (copied) Icons.Default.Check else Icons.Default.ContentCopy,
                    contentDescription = "Copy code",
                    tint = if (copied) MeyraAccentEmerald else TextMuted,
                    modifier = Modifier.size(16.dp)
                )
            }
        }

        // Code Content
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            Text(
                text = code,
                fontFamily = FontFamily.Monospace,
                fontSize = 13.sp,
                lineHeight = 18.sp,
                color = Color(0xFFE2E8F0)
            )
        }
    }
}

sealed class TextSection {
    data class Paragraph(val text: String) : TextSection()
    data class CodeBlock(val code: String, val language: String?) : TextSection()
}

fun parseMarkdownIntoSections(input: String): List<TextSection> {
    val sections = mutableListOf<TextSection>()
    val codeBlockRegex = Regex("```([a-zA-Z0-9_-]*)\\s*\\n([\\s\\S]*?)```")
    var lastIndex = 0

    for (match in codeBlockRegex.findAll(input)) {
        val before = input.substring(lastIndex, match.range.first).trim()
        if (before.isNotEmpty()) {
            sections.add(TextSection.Paragraph(before))
        }

        val lang = match.groupValues[1].ifBlank { null }
        val code = match.groupValues[2].trimEnd()
        sections.add(TextSection.CodeBlock(code, lang))
        lastIndex = match.range.last + 1
    }

    val remaining = input.substring(lastIndex).trim()
    if (remaining.isNotEmpty()) {
        sections.add(TextSection.Paragraph(remaining))
    }

    if (sections.isEmpty() && input.isNotEmpty()) {
        sections.add(TextSection.Paragraph(input))
    }

    return sections
}

fun buildFormattedAnnotatedString(text: String, defaultColor: Color) = buildAnnotatedString {
    var i = 0
    while (i < text.length) {
        if (text.startsWith("**", i)) {
            val end = text.indexOf("**", i + 2)
            if (end != -1) {
                withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = defaultColor)) {
                    append(text.substring(i + 2, end))
                }
                i = end + 2
                continue
            }
        } else if (text.startsWith("`", i)) {
            val end = text.indexOf("`", i + 1)
            if (end != -1) {
                withStyle(
                    SpanStyle(
                        fontFamily = FontFamily.Monospace,
                        background = Color(0xFF1E1E28),
                        color = Color(0xFF93C5FD)
                    )
                ) {
                    append(" ${text.substring(i + 1, end)} ")
                }
                i = end + 1
                continue
            }
        } else if (text.startsWith("*", i) && !text.startsWith("**", i)) {
            val end = text.indexOf("*", i + 1)
            if (end != -1) {
                withStyle(SpanStyle(fontStyle = FontStyle.Italic, color = defaultColor)) {
                    append(text.substring(i + 1, end))
                }
                i = end + 1
                continue
            }
        }
        append(text[i])
        i++
    }
}
