package com.triparro.app.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.outlined.AddPhotoAlternate
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.triparro.app.core.Api
import com.triparro.app.core.Upload
import com.triparro.app.core.bool
import com.triparro.app.core.int
import com.triparro.app.core.objs
import com.triparro.app.core.text
import com.triparro.app.ui.Brand
import com.triparro.app.ui.Notice
import kotlinx.coroutines.launch
import org.json.JSONObject

/*
 * Trip posts: a little social feed for the people in the trip — words and photos, likes and comments.
 * No phone numbers, email addresses or website links (the website checks too); everyone in the trip gets a notification.
 * The person who posted, or the person who made the trip, can delete a post.
 */

private val Faces = listOf(Color(0xFFFFC72C), Color(0xFFFF8A7A), Color(0xFF8C9BF2), Color(0xFF5CC29A), Color(0xFF7CC8F0), Color(0xFFF0A3D0))

/** The same check as the website, so the person sees why before sending. */
internal fun contactProblem(t: String): String? {
    val digits = t.replace(Regex("(?<=\\d)[\\s\\-().\\/]+(?=\\d)"), "")
    if (Regex("\\+?\\d{10,}").containsMatchIn(digits)) return "Posts can't include phone numbers — to keep the trip safe, share them in person."
    if (Regex("(?i)[A-Z0-9._%+\\-]+\\s*(@|\\(at\\)|\\[at\\]|\\s+at\\s+)\\s*[A-Z0-9\\-]+\\s*(\\.|\\(dot\\)|\\[dot\\]|\\s+dot\\s+)\\s*[A-Z]{2,}").containsMatchIn(t)) return "Posts can't include email addresses."
    if (Regex("(?i)(https?://|www\\.|wa\\.me|t\\.me|bit\\.ly|\\b[a-z0-9][a-z0-9\\-]{1,62}\\s*\\.\\s*(com|in|net|org|co|io|me|ly|app|info|biz|xyz|site|online|link|shop|store|club|live|tv|us|uk|page|dev)\\b)").containsMatchIn(t)) return "Posts can't include website links."
    return null
}

private fun ago(at: String): String = try {
    val t = java.time.LocalDateTime.parse(at.replace(' ', 'T'))
    val m = java.time.Duration.between(t, java.time.LocalDateTime.now()).toMinutes()
    when {
        m < 1 -> "Just now"
        m < 60 -> "$m min ago"
        m < 24 * 60 -> "${m / 60} h ago"
        m < 7 * 24 * 60 -> "${m / (24 * 60)} d ago"
        else -> t.format(java.time.format.DateTimeFormatter.ofPattern("d MMM yyyy"))
    }
} catch (_: Exception) { "" }

@Composable
private fun Face(name: String, id: Int, size: Int = 40) {
    Box(Modifier.size(size.dp).clip(CircleShape).background(Faces[Math.floorMod(id, Faces.size)]), contentAlignment = Alignment.Center) {
        Text(name.take(1).uppercase(), fontWeight = FontWeight.Bold, color = Brand.Ink, fontSize = (size * 0.42).sp)
    }
}

@Composable
fun PostsPanel(id: Int, g: JSONObject, onData: (JSONObject) -> Unit) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val me = g.objs("members").firstOrNull { it.bool("you") }
    var text by remember { mutableStateOf("") }
    val photos = remember { mutableStateListOf<Uri>() }
    var busy by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf<String?>(null) }
    var viewing by remember { mutableStateOf<Pair<List<String>, Int>?>(null) }
    var pendingShot by remember { mutableStateOf<Uri?>(null) }
    val pick = rememberLauncherForActivityResult(ActivityResultContracts.PickMultipleVisualMedia(6)) { list -> list.forEach { if (photos.size < 6) photos.add(it) } }
    val shoot = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { ok -> if (ok) pendingShot?.let { if (photos.size < 6) photos.add(it) } }
    val problem = contactProblem(text)
    fun send() {
        busy = true; err = null
        scope.launch {
            try {
                val files = photos.mapIndexedNotNull { i, u -> com.triparro.app.core.shrinkPhoto(ctx, u, "post$i")?.let { Upload("photos[]", it.first, it.second) } }
                onData(Api.postMultipart("trip-groups/$id/posts", listOf("body" to text.trim()), files))
                text = ""; photos.clear()
            } catch (e: Exception) { err = errorText(e) }
            busy = false
        }
    }
    fun act(path: String, body: Map<String, Any?> = emptyMap()) { scope.launch { try { onData(Api.post(path, body)); err = null } catch (e: Exception) { err = errorText(e) } } }

    // write a post
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp)).background(Color.White).border(1.dp, Brand.Line, RoundedCornerShape(22.dp)).padding(14.dp)) {
        Row(verticalAlignment = Alignment.Top) {
            Face(me?.text("name") ?: "You", me?.int("id") ?: 0)
            Box(Modifier.padding(start = 10.dp).weight(1f).clip(RoundedCornerShape(18.dp)).background(Color(0xFFF3F0EE)).padding(horizontal = 14.dp, vertical = 11.dp)) {
                if (text.isEmpty()) Text("Share a moment from the trip…", color = Brand.Muted, style = MaterialTheme.typography.bodyLarge)
                BasicTextField(text, { text = it.take(2000) }, Modifier.fillMaxWidth(), textStyle = TextStyle(fontSize = 16.sp, color = Brand.Ink), cursorBrush = SolidColor(Brand.Matte), maxLines = 8)
            }
        }
        if (photos.isNotEmpty()) Row(Modifier.padding(top = 10.dp).horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            photos.forEachIndexed { i, u ->
                Box(Modifier.size(84.dp).clip(RoundedCornerShape(14.dp))) {
                    AsyncImage(model = u, contentDescription = "Photo ${i + 1}", contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                    Icon(Icons.Outlined.Close, "Remove photo", tint = Color.White, modifier = Modifier.align(Alignment.TopEnd).padding(4.dp).size(22.dp).clip(CircleShape).background(Color(0x99000000)).clickable { photos.removeAt(i) }.padding(3.dp))
                }
            }
        }
        problem?.let { Text(it, color = Brand.Matte, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(top = 8.dp)) }
        err?.let { Notice(it, "bad", Modifier.padding(top = 8.dp)) }
        Row(Modifier.padding(top = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            Row(Modifier.clip(RoundedCornerShape(50)).clickable(enabled = photos.size < 6) { pick.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }.padding(horizontal = 10.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.AddPhotoAlternate, null, tint = Color(0xFF0E9F6E), modifier = Modifier.size(22.dp)); Text(" Photos", style = MaterialTheme.typography.labelLarge, color = Brand.InkSoft)
            }
            Row(Modifier.clip(RoundedCornerShape(50)).clickable(enabled = photos.size < 6) { try { val u = newPhoto(ctx, "post"); pendingShot = u; shoot.launch(u) } catch (_: Exception) { } }.padding(horizontal = 10.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.PhotoCamera, null, tint = Color(0xFF1F6FEB), modifier = Modifier.size(22.dp)); Text(" Camera", style = MaterialTheme.typography.labelLarge, color = Brand.InkSoft)
            }
            Spacer(Modifier.weight(1f))
            val can = !busy && problem == null && (text.isNotBlank() || photos.isNotEmpty())
            Box(Modifier.clip(RoundedCornerShape(50)).background(if (can) Brush.horizontalGradient(listOf(Brand.Matte, Color(0xFFE8452F))) else Brush.horizontalGradient(listOf(Color(0xFFE6DCD8), Color(0xFFE6DCD8))))
                .clickable(enabled = can) { send() }.padding(horizontal = 20.dp, vertical = 9.dp), contentAlignment = Alignment.Center) {
                if (busy) CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                else Text("Post", color = if (can) Color.White else Brand.Muted, fontWeight = FontWeight.Bold)
            }
        }
    }
    Text("Only people in this trip see posts. Phone numbers, emails and links can't be posted.", style = MaterialTheme.typography.labelSmall, color = Brand.Muted, modifier = Modifier.padding(top = 6.dp, start = 4.dp))

    val posts = g.objs("posts")
    if (posts.isEmpty()) Text("No posts yet — share the first photo of the trip!", style = MaterialTheme.typography.bodyMedium, color = Brand.InkSoft, modifier = Modifier.padding(vertical = 18.dp, horizontal = 4.dp))
    posts.forEach { p -> PostCard(id, p, ::act) { urls, i -> viewing = urls to i } }
    viewing?.let { (urls, i) -> PhotoViewer(urls, i) { viewing = null } }
}

@Composable
private fun PostCard(id: Int, p: JSONObject, act: (String, Map<String, Any?>) -> Unit, view: (List<String>, Int) -> Unit) {
    var showComments by remember { mutableStateOf(false) }
    var comment by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf<Pair<String, String>?>(null) }   // what to delete (path, question)
    val photos = (0 until (p.optJSONArray("photos")?.length() ?: 0)).map { p.optJSONArray("photos")!!.optString(it) }
    val comments = p.objs("comments")
    Column(Modifier.padding(top = 12.dp).fillMaxWidth().clip(RoundedCornerShape(22.dp)).background(Color.White).border(1.dp, Brand.Line, RoundedCornerShape(22.dp))) {
        Row(Modifier.padding(start = 14.dp, end = 4.dp, top = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Face(p.text("by"), p.int("by_id"))
            Column(Modifier.padding(start = 10.dp).weight(1f)) {
                Text(if (p.bool("mine")) "You" else p.text("by"), fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                Text(ago(p.text("at")), style = MaterialTheme.typography.labelSmall, color = Brand.Muted)
            }
            if (p.bool("can_delete")) IconButton(onClick = { confirm = "trip-groups/$id/items/${p.int("id")}/delete" to "Delete this post? Its photos and comments go too." }) {
                Icon(Icons.Outlined.DeleteOutline, "Delete post", tint = Brand.Muted)
            }
        }
        if (p.text("body").isNotBlank()) Text(p.text("body"), style = MaterialTheme.typography.bodyLarge, color = Brand.Ink, modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp))
        // photos: one big, or a grid of two columns ("+2" on the last one when there are more)
        if (photos.isNotEmpty()) Column(Modifier.padding(top = 4.dp)) {
            if (photos.size == 1) AsyncImage(model = photos[0], contentDescription = "Photo", contentScale = ContentScale.Crop, modifier = Modifier.fillMaxWidth().aspectRatio(4f / 3f).background(Brand.Sky).clickable { view(photos, 0) })
            else photos.take(4).chunked(2).forEachIndexed { r, pair ->
                Row(Modifier.padding(top = if (r > 0) 3.dp else 0.dp), horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                    pair.forEachIndexed { c, u ->
                        val i = r * 2 + c
                        Box(Modifier.weight(1f).aspectRatio(1f).background(Brand.Sky).clickable { view(photos, i) }) {
                            AsyncImage(model = u, contentDescription = "Photo ${i + 1}", contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                            if (i == 3 && photos.size > 4) Box(Modifier.fillMaxSize().background(Color(0x88000000)), contentAlignment = Alignment.Center) {
                                Text("+${photos.size - 4}", color = Color.White, fontSize = 26.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                    if (pair.size == 1) Spacer(Modifier.weight(1f))
                }
            }
        }
        // likes and comments
        if (p.int("likes") > 0 || comments.isNotEmpty()) Row(Modifier.padding(horizontal = 14.dp, vertical = 8.dp)) {
            if (p.int("likes") > 0) Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(18.dp).clip(CircleShape).background(Color(0xFFE8452F)), contentAlignment = Alignment.Center) { Icon(Icons.Filled.Favorite, null, tint = Color.White, modifier = Modifier.size(11.dp)) }
                Text(" ${p.int("likes")}", style = MaterialTheme.typography.labelMedium, color = Brand.InkSoft)
            }
            Spacer(Modifier.weight(1f))
            if (comments.isNotEmpty()) Text("${comments.size} comment" + if (comments.size == 1) "" else "s", style = MaterialTheme.typography.labelMedium, color = Brand.InkSoft, modifier = Modifier.clickable { showComments = !showComments })
        }
        Box(Modifier.padding(horizontal = 12.dp).fillMaxWidth().height(1.dp).background(Brand.Line))
        Row(Modifier.padding(horizontal = 6.dp, vertical = 2.dp)) {
            val liked = p.bool("liked")
            val tint by animateColorAsState(if (liked) Color(0xFFE8452F) else Brand.InkSoft, label = "like")
            Row(Modifier.weight(1f).clip(RoundedCornerShape(12.dp)).clickable { act("trip-groups/$id/posts/${p.int("id")}/like", emptyMap()) }.padding(vertical = 10.dp),
                horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                Icon(if (liked) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder, if (liked) "Unlike" else "Like", tint = tint, modifier = Modifier.size(20.dp))
                Text(" Like", color = tint, fontWeight = FontWeight.SemiBold)
            }
            Row(Modifier.weight(1f).clip(RoundedCornerShape(12.dp)).clickable { showComments = !showComments }.padding(vertical = 10.dp),
                horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.ChatBubbleOutline, null, tint = Brand.InkSoft, modifier = Modifier.size(20.dp))
                Text(" Comment", color = Brand.InkSoft, fontWeight = FontWeight.SemiBold)
            }
        }
        if (showComments) Column(Modifier.padding(horizontal = 12.dp).padding(bottom = 12.dp)) {
            comments.forEach { c ->
                Row(Modifier.padding(top = 8.dp), verticalAlignment = Alignment.Top) {
                    Face(c.text("by"), c.int("by_id"), 30)
                    Column(Modifier.padding(start = 8.dp).weight(1f).clip(RoundedCornerShape(16.dp)).background(Color(0xFFF3F0EE)).padding(horizontal = 12.dp, vertical = 8.dp)) {
                        Text(if (c.bool("mine")) "You" else c.text("by"), fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelLarge)
                        Text(c.text("body"), style = MaterialTheme.typography.bodyMedium)
                        Text(ago(c.text("at")), style = MaterialTheme.typography.labelSmall, color = Brand.Muted)
                    }
                    if (c.bool("can_delete")) IconButton(onClick = { confirm = "trip-groups/$id/comments/${c.int("id")}/delete" to "Delete this comment?" }, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Outlined.Close, "Delete comment", tint = Brand.Muted, modifier = Modifier.size(16.dp))
                    }
                }
            }
            val problem = contactProblem(comment)
            Row(Modifier.padding(top = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.weight(1f).clip(RoundedCornerShape(20.dp)).background(Color(0xFFF3F0EE)).padding(horizontal = 14.dp, vertical = 10.dp)) {
                    if (comment.isEmpty()) Text("Write a comment…", color = Brand.Muted)
                    BasicTextField(comment, { comment = it.take(1000) }, Modifier.fillMaxWidth(), textStyle = TextStyle(fontSize = 15.sp, color = Brand.Ink), cursorBrush = SolidColor(Brand.Matte), maxLines = 4)
                }
                TextButton(enabled = comment.isNotBlank() && problem == null, onClick = { act("trip-groups/$id/posts/${p.int("id")}/comments", mapOf("body" to comment.trim())); comment = "" }) { Text("Send", fontWeight = FontWeight.Bold) }
            }
            problem?.let { Text(it.replace("Posts", "Comments"), color = Brand.Matte, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(top = 4.dp)) }
        }
    }
    confirm?.let { (path, q) ->
        AlertDialog(onDismissRequest = { confirm = null }, title = { Text(q) },
            confirmButton = { TextButton(onClick = { confirm = null; act(path, emptyMap()) }) { Text("Delete") } },
            dismissButton = { TextButton(onClick = { confirm = null }) { Text("Keep") } })
    }
}

/** Full-screen photos, swipe between them. */
@Composable
private fun PhotoViewer(urls: List<String>, start: Int, onClose: () -> Unit) {
    Dialog(onDismissRequest = onClose, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Box(Modifier.fillMaxSize().background(Color(0xF2000000))) {
            val pager = rememberPagerState(initialPage = start) { urls.size }
            HorizontalPager(pager, Modifier.fillMaxSize()) { i ->
                AsyncImage(model = urls[i], contentDescription = "Photo ${i + 1} of ${urls.size}", contentScale = ContentScale.Fit, modifier = Modifier.fillMaxSize().padding(8.dp))
            }
            if (urls.size > 1) Text("${pager.currentPage + 1} / ${urls.size}", color = Color.White, modifier = Modifier.align(Alignment.BottomCenter).padding(24.dp))
            IconButton(onClick = onClose, modifier = Modifier.align(Alignment.TopEnd).padding(12.dp)) { Icon(Icons.Outlined.Close, "Close", tint = Color.White, modifier = Modifier.size(28.dp)) }
        }
    }
}
