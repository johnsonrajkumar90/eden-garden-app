package com.triparro.app.screens

import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.AddPhotoAlternate
import androidx.compose.material.icons.outlined.ChatBubble
import androidx.compose.material.icons.outlined.Checklist
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Favorite
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.PersonAdd
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.material.icons.outlined.Receipt
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material.icons.outlined.StarBorder
import androidx.compose.material.icons.outlined.TaskAlt
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import androidx.navigation.NavHostController
import coil.compose.AsyncImage
import com.triparro.app.AppState
import com.triparro.app.core.Api
import com.triparro.app.core.Upload
import com.triparro.app.core.bool
import com.triparro.app.core.copyToCache
import com.triparro.app.core.int
import com.triparro.app.core.obj
import com.triparro.app.core.objs
import com.triparro.app.core.str
import com.triparro.app.core.text
import com.triparro.app.ui.Brand
import com.triparro.app.ui.ErrorBox
import com.triparro.app.ui.Field
import com.triparro.app.ui.Gap
import com.triparro.app.ui.Loading
import com.triparro.app.ui.Notice
import com.triparro.app.ui.PrimaryButton
import com.triparro.app.ui.appear
import com.triparro.app.ui.money
import com.triparro.app.ui.pressable
import com.triparro.app.ui.shareLink
import dev.chrisbanes.haze.HazeStyle
import dev.chrisbanes.haze.HazeTint
import dev.chrisbanes.haze.hazeEffect
import dev.chrisbanes.haze.hazeSource
import dev.chrisbanes.haze.rememberHazeState
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.File

/*
 * One group trip, as a dark glass dashboard: the trip photo with dates and name, trip readiness, chat and travellers,
 * an invite strip, four shortcuts (add to the plan, trip docs, expenses, checklist), then the plan, favourites and map.
 */

private val Night = Color(0xFF15161C)
private val NightPlum = Color(0xFF241A2A)
private val Frost = Color(0x1FFFFFFF)
private val FrostLine = Color(0x2EFFFFFF)
private val Soft = Color(0xB3FFFFFF)

/** Dark frosted glass (tiles on the night background). */
private fun Modifier.darkGlass(shape: androidx.compose.ui.graphics.Shape = RoundedCornerShape(26.dp)): Modifier =
    this.clip(shape).background(Brush.verticalGradient(listOf(Color(0x29FFFFFF), Color(0x14FFFFFF)))).border(1.dp, Brush.verticalGradient(listOf(Color(0x40FFFFFF), Color(0x14FFFFFF))), shape)

private fun newPhoto(ctx: Context, prefix: String): Uri {
    val dir = File(ctx.cacheDir, "images").apply { mkdirs() }
    return FileProvider.getUriForFile(ctx, ctx.packageName + ".files", File.createTempFile(prefix, ".jpg", dir))
}

private fun niceDay(iso: String?): String = try {
    if (iso.isNullOrBlank()) "" else java.time.LocalDate.parse(iso.take(10)).format(java.time.format.DateTimeFormatter.ofPattern("EEE, d MMM"))
} catch (_: Exception) { "" }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GroupTripScreen(nav: NavHostController, id: Int) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var data by remember { mutableStateOf<JSONObject?>(null) }
    val l = rememberLoader(id) { Api.get("trip-groups/$id") }
    LaunchedEffect(l.data.value) { l.data.value?.let { data = it } }
    var tab by rememberSaveable { mutableStateOf("posts") }
    var sheet by rememberSaveable { mutableStateOf("") }   // add, docs, expenses, checklist, people, chat, readiness, fav
    var err by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    fun act(path: String, body: Map<String, Any?> = emptyMap()) {
        scope.launch { try { data = Api.post(path, body); err = null } catch (e: Exception) { err = errorText(e) } }
    }
    fun upload(path: String, fields: List<Pair<String, String>>, photo: Uri?, after: () -> Unit = {}) {
        busy = true
        scope.launch {
            try {
                val files = photo?.let { u -> com.triparro.app.core.shrinkPhoto(ctx, u, "tg")?.let { listOf(Upload("photo", it.first, it.second)) } } ?: emptyList()
                data = Api.postMultipart(path, fields, files); err = null; after()
            } catch (e: Exception) { err = errorText(e) }
            busy = false
        }
    }
    // the chat stays fresh while it is open
    LaunchedEffect(id, sheet) { while (sheet == "chat") { kotlinx.coroutines.delay(8000); try { data = Api.get("trip-groups/$id") } catch (_: Exception) { } } }
    var pendingCover by remember { mutableStateOf<Uri?>(null) }
    val coverCamera = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { ok -> if (ok) pendingCover?.let { upload("trip-groups/$id/cover", emptyList(), it) } }
    val coverGallery = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { u -> u?.let { upload("trip-groups/$id/cover", emptyList(), it) } }
    var coverMenu by remember { mutableStateOf(false) }
    var inviting by remember { mutableStateOf(false) }

    val g = data
    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Night, NightPlum, Night)))) {
        when {
            g == null && l.loading.value -> Loading()
            g == null -> Column { TopRow(nav, null, {}) ; ErrorBox(l.error.value ?: "This trip was not found.", { l.reload() }) }
            else -> Column(Modifier.fillMaxSize()) {
                TopRow(nav, g) { coverMenu = true }
                Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
                val hero = rememberHazeState()
                Box(Modifier.fillMaxWidth().height(360.dp)) {
                    Box(Modifier.matchParentSize().hazeSource(hero)) {
                        TripCover(g.str("cover"), g.text("title") + " " + g.text("destination"), Modifier.fillMaxSize(), iconSize = 200)
                        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0f to Color(0x55000000), 0.35f to Color(0x00000000), 0.7f to Color(0x99000000), 1f to Night)))
                    }
                    Column(Modifier.align(Alignment.BottomStart).padding(horizontal = 20.dp).padding(bottom = 96.dp)) {
                        val d1 = niceDay(g.str("start_date")); val d2 = niceDay(g.str("end_date"))
                        if (d1.isNotBlank()) Text(if (d2.isNotBlank() && d2 != d1) "$d1  →  $d2" else d1, color = Color.White, style = MaterialTheme.typography.titleMedium)
                        Row(verticalAlignment = Alignment.Bottom) {
                            Text(g.text("title"), color = Color.White, fontSize = 34.sp, lineHeight = 38.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f), maxLines = 3, overflow = TextOverflow.Ellipsis)
                            Text("Track spending ›", color = Soft, style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(start = 8.dp, bottom = 6.dp).clickable { sheet = "expenses" })
                        }
                    }
                    // trip readiness, frosted over the photo
                    val r = g.obj("readiness") ?: JSONObject()
                    Row(Modifier.align(Alignment.BottomCenter).padding(horizontal = 16.dp).padding(bottom = 12.dp).fillMaxWidth().clip(RoundedCornerShape(40.dp))
                        .hazeEffect(hero, HazeStyle(backgroundColor = Night, tints = listOf(HazeTint(Color(0x66202028))), blurRadius = 24.dp, noiseFactor = 0.05f, fallbackTint = HazeTint(Color(0xCC202028))))
                        .border(1.dp, FrostLine, RoundedCornerShape(40.dp)).pressable({ sheet = "readiness" }).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Ring(r.int("percent"))
                        Column(Modifier.padding(start = 14.dp).weight(1f)) {
                            Text("Trip readiness", color = Color.White, style = MaterialTheme.typography.titleMedium)
                            Text(if (r.int("left") == 0) "All set — have a great trip!" else if (r.int("left") == 1) "One thing left to sort" else "A few things left to sort", color = Soft, style = MaterialTheme.typography.bodySmall)
                        }
                        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = Color.White)
                    }
                }
                Column(Modifier.padding(horizontal = 16.dp)) {
                    err?.let { Notice(it, "bad", Modifier.padding(bottom = 10.dp)) }
                    // chat + travellers
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        val msgs = g.objs("messages")
                        DarkTile(Modifier.weight(1f), { nav.navigate("groupchat/$id") }) {
                            Box(Modifier.size(44.dp).clip(CircleShape).background(Frost), contentAlignment = Alignment.Center) { Icon(Icons.Outlined.ChatBubble, null, tint = Color.White) }
                            Column(Modifier.padding(start = 10.dp)) {
                                Text("Trip chat", color = Color.White, style = MaterialTheme.typography.titleSmall)
                                Text(msgs.lastOrNull()?.let { m -> (if (m.bool("mine")) "You" else m.text("by").substringBefore(' ')) + ": " + m.text("body") } ?: "Say hello", color = Soft, style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                        }
                        val members = g.objs("members")
                        DarkTile(Modifier.weight(1f), { sheet = "people" }) {
                            Avatars(members.map { it.text("initial") }, 34.dp)
                            Column(Modifier.padding(start = 8.dp)) {
                                Text("${members.size} traveller" + if (members.size == 1) "" else "s", color = Color.White, style = MaterialTheme.typography.titleSmall)
                                Text("See all", color = Soft, style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                    Gap()
                    // invite strip
                    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(30.dp)).background(Color(0xFF2A2414)).border(1.dp, Color(0x55E0B44A), RoundedCornerShape(30.dp))
                        .pressable({ inviting = true }).padding(horizontal = 18.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.PersonAdd, null, tint = Color(0xFFF2C14E))
                        Text(if (g.objs("members").size < 2) "Invite family & friends" else "Invite more people", color = Color(0xFFF2C14E), style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(start = 10.dp).weight(1f))
                        Text("· Code " + g.text("code"), color = Color.White, style = MaterialTheme.typography.titleSmall)
                    }
                    Gap()
                    // shortcuts
                    val items = g.objs("items")
                    val docs = items.count { it.text("kind") in listOf("booking", "ticket") }
                    val todos = items.filter { it.text("kind") == "todo" }
                    val ex = g.obj("expenses") ?: JSONObject()
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Shortcut(Modifier.weight(1f), Icons.Outlined.Add, listOf(Color(0xFFFFE4DE), Color(0xFFFF8A7A)), Color(0xFFB81D2B), "Add to\nthe plan", null) { sheet = "add" }
                        Shortcut(Modifier.weight(1f), Icons.Outlined.Folder, listOf(Color(0xFFFFF2D6), Color(0xFFE8B45A)), Color(0xFF7A4A00), "Trip\ndocs", if (docs > 0) docs.toString() else null) { sheet = "docs" }
                        Shortcut(Modifier.weight(1f), Icons.Outlined.AccountBalanceWallet, listOf(Color(0xFFDDF3EA), Color(0xFF5CC29A)), Color(0xFF0F5C40), "Trip\nexpenses", if (ex.optDouble("total") > 0) money(ex.optDouble("total")) else null) { sheet = "expenses" }
                        Shortcut(Modifier.weight(1f), Icons.Outlined.Checklist, listOf(Color(0xFFE3E8FF), Color(0xFF8C9BF2)), Color(0xFF26338A), "Trip\nchecklist", if (todos.isNotEmpty()) "${todos.count { it.bool("done") }}/${todos.size}" else null) { sheet = "checklist" }
                    }
                    Gap(18)
                    // plan / favourites / map
                    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(30.dp)).background(Color(0x66000000)).padding(5.dp)) {
                        listOf("posts" to "Posts", "plan" to "Plan", "fav" to "Favourites", "map" to "Map").forEach { (v, t) ->
                            val on = tab == v
                            Box(Modifier.weight(1f).clip(RoundedCornerShape(26.dp)).background(if (on) Color.White else Color.Transparent).clickable { tab = v }.padding(vertical = 12.dp), contentAlignment = Alignment.Center) {
                                Text(t, color = if (on) Brand.Ink else Color.White, style = MaterialTheme.typography.titleSmall)
                            }
                        }
                    }
                    Gap(14)
                }
                // the content panel (light frosted, like a card sheet)
                Column(Modifier.fillMaxWidth().padding(horizontal = 12.dp).clip(RoundedCornerShape(30.dp)).background(Color(0xF2F7F3F1)).padding(16.dp)) {
                    when (tab) {
                        "fav" -> {
                            FavouritesPanel(g, ctx, onAdd = { sheet = "fav" }, toggle = { iid -> act("trip-groups/$id/items/$iid/toggle") }, delete = { iid -> act("trip-groups/$id/items/$iid/delete") })
                            // good places to eat at the destination (Google): one tap saves it for the whole group
                            g.optJSONArray("dest")?.let { d ->
                                Gap(16)
                                RestaurantsRow(d.optDouble(0), d.optDouble(1), "Where to eat in " + g.text("destination").ifBlank { "the area" }) { r ->
                                    act("trip-groups/$id/items", mapOf("kind" to "fav", "title" to r.text("name"), "category" to (if (r.text("type").contains("caf", true) || r.text("type").contains("bakery", true)) "cafe" else "restaurant"),
                                        "place_id" to r.text("place_id"), "address" to r.text("address"), "maps_url" to r.text("maps_url"), "photo_credit" to r.text("photo_credit"),
                                        "google_rating" to (if (r.isNull("rating")) null else r.optDouble("rating")), "lat" to r.opt("lat"), "lng" to r.opt("lng"), "google_photo" to r.str("photo")))
                                }
                            }
                        }
                        "map" -> GroupMap(g, ctx, tall = true)
                        "posts" -> PostsPanel(id, g) { nd -> data = nd }
                        else -> PlanPanel(nav, id, g, ctx, { sheet = "add" }) { path -> act(path) }
                    }
                }
                Spacer(Modifier.height(40.dp))
                }
            }
        }
    }

    data?.let { gg -> if (inviting) ShareTripDialog(gg, justMade = false) { inviting = false } }
    if (coverMenu && data != null) ModalBottomSheet(onDismissRequest = { coverMenu = false }, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = Color(0xFFFBF8F6)) {
        err?.let { Notice(it, "bad", Modifier.padding(horizontal = 18.dp).padding(bottom = 8.dp)) }
        CoverSheet(id, data!!, busy,
            onAlbum = { coverGallery.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
            onCamera = { try { val u = newPhoto(ctx, "cover"); pendingCover = u; coverCamera.launch(u) } catch (_: Exception) { } },
            onWeb = { photo ->
                busy = true
                scope.launch {
                    try { data = Api.post("trip-groups/$id/cover", if (photo == null) mapOf("auto" to 1) else mapOf("google_photo" to photo)); err = null } catch (e: Exception) { err = errorText(e) }
                    busy = false
                }
            })
    }

    val g2 = data
    if (sheet.isNotEmpty() && g2 != null) {
        val state = rememberModalBottomSheetState(skipPartiallyExpanded = sheet in listOf("chat", "expenses", "fav", "add"))
        LaunchedEffect(sheet) { err = null }
        ModalBottomSheet(onDismissRequest = { sheet = "" }, sheetState = state, containerColor = Color(0xFFFBF8F6)) {
            // what went wrong shows here, on the sheet — not hidden behind it
            err?.let { Notice(it, "bad", Modifier.padding(horizontal = 18.dp).padding(bottom = 8.dp)) }
            when (sheet) {
                "add" -> AddToGroup(id) { nd -> data = nd; sheet = "" }
                "chat" -> Box(Modifier.fillMaxWidth().height(560.dp)) { GroupChat(g2) { msg -> act("trip-groups/$id/items", mapOf("kind" to "message", "body" to msg)) } }
                "people" -> PeopleSheet(g2, ctx, { act("trip-groups/$id/code") }, { uid -> act("trip-groups/$id/members/$uid/remove") }) { leave ->
                    sheet = ""
                    scope.launch { try { Api.post(if (leave == "delete") "trip-groups/$id/delete" else "trip-groups/$id/leave"); AppState.refreshTick.value++; nav.popBackStack() } catch (e: Exception) { err = errorText(e) } }
                }
                "docs" -> SheetList("Trip docs", "Stays and travel tickets the group has shared.") {
                    val docs = g2.objs("items").filter { it.text("kind") in listOf("booking", "ticket") }
                    if (docs.isEmpty()) Text("Nothing yet — share your booking or ticket with “Add to the plan”.", color = Brand.Muted)
                    docs.forEach { item -> GroupItem(nav, id, item, ctx, {}) { act("trip-groups/$id/items/${item.int("id")}/delete") } }
                }
                "checklist" -> ChecklistSheet(g2, { t -> act("trip-groups/$id/items", mapOf("kind" to "todo", "title" to t)) }, { iid -> act("trip-groups/$id/items/$iid/toggle") }) { iid -> act("trip-groups/$id/items/$iid/delete") }
                "readiness" -> SheetList("Trip readiness", "${g2.obj("readiness")?.int("percent") ?: 0}% ready") {
                    g2.obj("readiness")?.objs("steps")?.forEach { s ->
                        Row(Modifier.padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(if (s.bool("done")) Icons.Outlined.TaskAlt else Icons.Outlined.Add, null, tint = if (s.bool("done")) Brand.Teal else Brand.Muted)
                            Text(s.text("label"), Modifier.padding(start = 10.dp), color = if (s.bool("done")) Brand.Ink else Brand.InkSoft, style = MaterialTheme.typography.bodyLarge)
                        }
                    }
                }
                "expenses" -> ExpensesSheet(id, g2, { b -> act("trip-groups/$id/expenses", b) }) { eid -> act("trip-groups/$id/expenses/$eid/delete") }
                "fav" -> AddFavourite(g2, busy) { fields, photo -> upload("trip-groups/$id/items", fields, photo) { sheet = ""; tab = "fav" } }
            }
        }
    }
}

@Composable
private fun TopRow(nav: NavHostController, g: JSONObject?, onCamera: () -> Unit) {
    val ctx = LocalContext.current
    // the red bar every screen has: back, the trip's name, invite, change photo
    Row(Modifier.fillMaxWidth().background(Brush.horizontalGradient(listOf(Brand.Matte, Color(0xFFD7192A), Color(0xFFE8452F)))).padding(horizontal = 8.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = Color.White) }
        Text(g?.text("title") ?: "Your trip", color = Color.White, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold,
            maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f).padding(start = 4.dp))
        if (g != null) {
            IconButton(onClick = { shareLink(ctx, g.text("share_text"), g.text("link")) }) { Icon(Icons.Outlined.Share, "Invite", tint = Color.White) }
            Row(Modifier.height(40.dp).clip(RoundedCornerShape(50)).background(Color(0x33FFFFFF)).border(1.dp, Color(0x55FFFFFF), RoundedCornerShape(50)).pressable(onCamera).padding(horizontal = 14.dp),
                verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.PhotoCamera, null, tint = Color.White, modifier = Modifier.padding(end = 6.dp).size(18.dp))
                Text("Change photo", color = Color.White, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun RoundDark(icon: ImageVector, label: String, onClick: () -> Unit) {
    Box(Modifier.size(48.dp).clip(CircleShape).background(Color(0x66000000)).border(1.dp, FrostLine, CircleShape).pressable(onClick), contentAlignment = Alignment.Center) {
        Icon(icon, label, tint = Color.White)
    }
}

/** The readiness ring: a white disc with the percent, the arc filling in. */
@Composable
private fun Ring(percent: Int) {
    val p by animateFloatAsState(percent / 100f, tween(900), label = "ring")
    Box(Modifier.size(58.dp), contentAlignment = Alignment.Center) {
        Canvas(Modifier.fillMaxSize()) {
            drawCircle(Color.White, radius = size.minDimension / 2 - 6f)
            drawArc(Color(0x33FFFFFF), 0f, 360f, false, style = Stroke(6f))
            drawArc(Brush.sweepGradient(listOf(Color(0xFF7FA8FF), Color(0xFF5B7BF0), Color(0xFF7FA8FF))), -90f, 360f * p, false, style = Stroke(6f, cap = StrokeCap.Round))
        }
        Text("$percent%", color = Brand.Ink, fontWeight = FontWeight.Bold, fontSize = 15.sp)
    }
}

@Composable
private fun DarkTile(modifier: Modifier, onClick: () -> Unit, content: @Composable RowScope.() -> Unit) {
    Row(modifier.appear().darkGlass(RoundedCornerShape(30.dp)).pressable(onClick).padding(14.dp), verticalAlignment = Alignment.CenterVertically, content = content)
}

@Composable
private fun Avatars(initials: List<String>, size: Dp) {
    val shown = initials.take(3)
    val colors = listOf(Color(0xFFFFC72C), Color(0xFFFF8A7A), Color(0xFF8C9BF2), Color(0xFF5CC29A))
    Box(Modifier.width(size + (size * 0.55f) * (shown.size - 1).coerceAtLeast(0)).height(size)) {
        shown.forEachIndexed { i, t ->
            Box(Modifier.offset(x = size * 0.55f * i).size(size).clip(CircleShape).background(colors[i % colors.size]).border(2.dp, Night, CircleShape), contentAlignment = Alignment.Center) {
                Text(t, color = Brand.Ink, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            }
        }
    }
}

@Composable
private fun Shortcut(modifier: Modifier, icon: ImageVector, ball: List<Color>, tint: Color, label: String, badge: String?, onClick: () -> Unit) {
    Box(modifier) {
        Column(Modifier.fillMaxWidth().appear().darkGlass(RoundedCornerShape(26.dp)).pressable(onClick).padding(vertical = 16.dp, horizontal = 6.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            // a soft 3D ball for the icon
            Box(Modifier.size(52.dp).clip(CircleShape).background(Brush.radialGradient(listOf(ball[0], ball[1]), center = Offset(40f, 30f), radius = 120f)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = tint, modifier = Modifier.size(28.dp))
            }
            Text(label, color = Color.White, style = MaterialTheme.typography.labelMedium, textAlign = androidx.compose.ui.text.style.TextAlign.Center, modifier = Modifier.padding(top = 10.dp), lineHeight = 15.sp)
        }
        badge?.let {
            Text(it, color = Brand.Ink, fontWeight = FontWeight.Bold, fontSize = 11.sp, maxLines = 1,
                modifier = Modifier.align(Alignment.TopEnd).offset(x = 2.dp, y = (-4).dp).clip(RoundedCornerShape(50)).background(Color.White).padding(horizontal = 7.dp, vertical = 2.dp))
        }
    }
}

@Composable
private fun SheetList(title: String, sub: String?, content: @Composable () -> Unit) {
    Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 28.dp)) {
        Text(title, style = MaterialTheme.typography.titleLarge)
        sub?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Brand.Muted, modifier = Modifier.padding(bottom = 10.dp)) }
        content()
    }
}

@Composable
private fun PlanPanel(nav: NavHostController, id: Int, g: JSONObject, ctx: Context, onAdd: () -> Unit, act: (String) -> Unit) {
    val items = g.objs("items").filter { it.text("kind") != "fav" }
    if (items.isEmpty()) {
        Text("Start planning", style = MaterialTheme.typography.titleMedium)
        Text("Share your booking or ticket, add places to visit, notes and a packing list — everyone in the trip sees them.", style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft, modifier = Modifier.padding(vertical = 6.dp))
        PrimaryButton("Add to the plan", onAdd, Modifier.fillMaxWidth(), icon = Icons.Outlined.Add, coral = true)
        return
    }
    listOf("booking" to "Stays booked", "ticket" to "Travel tickets", "plan" to "Trip plans", "place" to "Places to visit", "todo" to "To-do & packing", "note" to "Notes").forEach { (k, head) ->
        val list = items.filter { it.text("kind") == k }
        if (list.isNotEmpty()) {
            Text(head, style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 6.dp, bottom = 6.dp))
            list.forEach { item -> GroupItem(nav, id, item, ctx, { act("trip-groups/$id/items/${item.int("id")}/toggle") }) { act("trip-groups/$id/items/${item.int("id")}/delete") } }
        }
    }
}

/** Favourite places: photo cards (own photo or Google), stars, note, visited tick — the whole group keeps the list. */
@Composable
private fun FavouritesPanel(g: JSONObject, ctx: Context, onAdd: () -> Unit, toggle: (Int) -> Unit, delete: (Int) -> Unit) {
    val favs = g.objs("items").filter { it.text("kind") == "fav" }
    Row(verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text("Favourite places", style = MaterialTheme.typography.titleMedium)
            Text("${favs.size} saved · ${favs.count { it.obj("fav")?.bool("visited") == true }} visited", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
        }
        PrimaryButton("Add", onAdd, Modifier.width(112.dp), icon = Icons.Outlined.Favorite, coral = true)
    }
    Gap(10)
    if (favs.isEmpty()) Text("Found a great restaurant, café or view? Take a photo or find it on Google and save it here for everyone.", color = Brand.InkSoft, style = MaterialTheme.typography.bodyMedium)
    favs.chunked(2).forEach { pair ->
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(bottom = 10.dp)) {
            pair.forEach { item -> FavCard(item, ctx, Modifier.weight(1f), { toggle(item.int("id")) }) { delete(item.int("id")) } }
            if (pair.size == 1) Spacer(Modifier.weight(1f))
        }
    }
}

@Composable
private fun FavCard(item: JSONObject, ctx: Context, modifier: Modifier, toggle: () -> Unit, delete: () -> Unit) {
    val f = item.obj("fav") ?: JSONObject()
    var confirm by remember { mutableStateOf(false) }
    Column(modifier.appear().clip(RoundedCornerShape(22.dp)).background(Color.White).border(1.dp, Brand.Line, RoundedCornerShape(22.dp))
        .pressable({ f.str("maps_url")?.let { openGroupUrl(ctx, it) } ?: item.optJSONArray("coords")?.let { c -> openGroupUrl(ctx, "https://www.google.com/maps/search/?api=1&query=${c.optDouble(0)},${c.optDouble(1)}") } })) {
        Box(Modifier.fillMaxWidth().aspectRatio(1.1f).background(Brand.Sky)) {
            f.str("photo")?.let { AsyncImage(model = it, contentDescription = item.text("title"), contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize()) }
                ?: Icon(Icons.Outlined.Place, null, tint = Brand.Coral, modifier = Modifier.align(Alignment.Center).size(36.dp))
            Text(f.text("category_label"), style = MaterialTheme.typography.labelSmall, color = Brand.Ink,
                modifier = Modifier.align(Alignment.TopStart).padding(8.dp).clip(RoundedCornerShape(50)).background(Color(0xEEFFFFFF)).padding(horizontal = 8.dp, vertical = 3.dp))
            Box(Modifier.align(Alignment.TopEnd).padding(6.dp).size(34.dp).clip(CircleShape).background(if (f.bool("visited")) Brand.Teal else Color(0xCCFFFFFF)).clickable(onClick = toggle), contentAlignment = Alignment.Center) {
                Icon(Icons.Outlined.TaskAlt, if (f.bool("visited")) "Visited" else "Mark visited", tint = if (f.bool("visited")) Color.White else Brand.Muted, modifier = Modifier.size(20.dp))
            }
            if (f.text("photo_credit").isNotBlank()) Text("Photo: " + f.text("photo_credit") + " · Google", fontSize = 9.sp, color = Color.White, maxLines = 1,
                modifier = Modifier.align(Alignment.BottomStart).fillMaxWidth().background(Color(0x66000000)).padding(horizontal = 6.dp, vertical = 2.dp))
        }
        Column(Modifier.padding(10.dp)) {
            Text(item.text("title"), style = MaterialTheme.typography.titleSmall, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Row(verticalAlignment = Alignment.CenterVertically) {
                repeat(5) { i -> Icon(if (i < f.int("stars")) Icons.Outlined.Star else Icons.Outlined.StarBorder, null, tint = Color(0xFFF2B01E), modifier = Modifier.size(14.dp)) }
                if (f.has("google_rating") && !f.isNull("google_rating")) Text("  Google ${f.optDouble("google_rating")}", style = MaterialTheme.typography.labelSmall, color = Brand.Muted)
            }
            item.str("body")?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft, maxLines = 3, overflow = TextOverflow.Ellipsis) }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("by " + item.text("by"), style = MaterialTheme.typography.labelSmall, color = Brand.Muted, modifier = Modifier.weight(1f))
                if (item.bool("can_delete")) IconButton(onClick = { confirm = true }, modifier = Modifier.size(30.dp)) { Icon(Icons.Outlined.Delete, "Delete", tint = Brand.Muted, modifier = Modifier.size(18.dp)) }
            }
        }
    }
    if (confirm) AlertDialog(onDismissRequest = { confirm = false }, title = { Text("Remove ${item.text("title")}?") },
        confirmButton = { TextButton(onClick = { confirm = false; delete() }) { Text("Remove") } }, dismissButton = { TextButton(onClick = { confirm = false }) { Text("Keep") } })
}

/** Save a favourite: find it on Google (photo, rating, map) or type it, add your own photo, stars and a note. */
@Composable
private fun AddFavourite(g: JSONObject, busy: Boolean, save: (List<Pair<String, String>>, Uri?) -> Unit) {
    val ctx = LocalContext.current
    var q by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
    var googleOn by remember { mutableStateOf(g.bool("google_places")) }
    var picked by remember { mutableStateOf<JSONObject?>(null) }
    var name by remember { mutableStateOf("") }
    var cat by remember { mutableStateOf("restaurant") }
    var stars by remember { mutableStateOf(0) }
    var note by remember { mutableStateOf("") }
    var photo by remember { mutableStateOf<Uri?>(null) }
    var pending by remember { mutableStateOf<Uri?>(null) }
    val camera = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { ok -> if (ok) photo = pending }
    val gallery = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { u -> if (u != null) photo = u }
    var searchNote by remember { mutableStateOf<String?>(null) }
    var here by remember { mutableStateOf(false) }       // "I'm here now": the phone's location, named by Google
    var spot by remember { mutableStateOf<Triple<String, Double, Double>?>(null) }
    LaunchedEffect(q) {
        searchNote = null
        if (q.length < 3 || !googleOn) { results = emptyList(); return@LaunchedEffect }
        kotlinx.coroutines.delay(450)
        try {
            val d = g.optJSONArray("dest")
            val r = Api.get("places/search", mapOf("q" to q) + (if (d != null) mapOf("lat" to d.optDouble(0), "lng" to d.optDouble(1)) else emptyMap()))
            googleOn = r.bool("google"); results = r.objs("items")
            searchNote = r.str("error") ?: if (results.isEmpty()) "Nothing found on Google — check the spelling, or type the name below." else null
        } catch (e: Exception) { results = emptyList(); searchNote = "Google search didn't answer (${errorText(e)}). Type the name below." }
    }
    Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 28.dp)) {
        Text("Save a favourite place", style = MaterialTheme.typography.titleLarge)
        Text("Restaurants, cafés, views — the whole group sees your list and can tick off what they've visited.", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
        Gap(10)
        if (picked == null) {
            PlaceSource(here) { v -> here = v; spot = null; if (v) q = "" }
            Gap(10)
        }
        if (here && picked == null) {
            LiveSpot { n, la, ln -> spot = Triple(n, la, ln); if (n.isNotBlank()) name = n }
            Gap(10)
        }
        if (!googleOn && !here && picked == null) Text("Google search isn't switched on for TripArro yet — type the place's name and add your own photo.",
            style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft, modifier = Modifier.padding(bottom = 8.dp))
        if (googleOn && picked == null && !here) {
            Field("Find on Google", q, { q = it }, placeholder = "e.g. Annapoorna, RS Puram")
            searchNote?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = Brand.InkSoft, modifier = Modifier.padding(top = 6.dp)) }
            results.take(6).forEach { p ->
                Row(Modifier.fillMaxWidth().padding(top = 8.dp).clip(RoundedCornerShape(16.dp)).border(1.dp, Brand.Line, RoundedCornerShape(16.dp)).clickable {
                    picked = p; name = p.text("name"); cat = if (p.text("type").contains("caf", true)) "cafe" else if (p.text("type").contains("restaurant", true) || p.text("type").contains("food", true)) "restaurant" else "place"
                }.padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(56.dp).clip(RoundedCornerShape(12.dp)).background(Brand.Sky)) { p.str("photo_url")?.let { AsyncImage(model = it, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize()) } }
                    Column(Modifier.padding(start = 10.dp).weight(1f)) {
                        Text(p.text("name"), style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(listOf(p.text("type"), if (p.has("rating") && !p.isNull("rating")) "★ ${p.optDouble("rating")}" else "").filter { it.isNotBlank() }.joinToString(" · "), style = MaterialTheme.typography.labelSmall, color = Brand.Blue)
                        Text(p.text("address"), style = MaterialTheme.typography.labelSmall, color = Brand.Muted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
            }
            if (results.isNotEmpty()) Text("Results from Google", style = MaterialTheme.typography.labelSmall, color = Brand.Muted, modifier = Modifier.padding(top = 6.dp))
            Gap(10)
            Text("Or type it yourself:", style = MaterialTheme.typography.labelMedium, color = Brand.InkSoft)
        }
        picked?.let { p ->
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Brand.Sky).padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Search, null, tint = Brand.Blue)
                Text("From Google: " + p.text("name"), Modifier.padding(start = 8.dp).weight(1f), style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                TextButton(onClick = { picked = null }) { Text("Change") }
            }
            Gap(8)
        }
        Field("Name", name, { name = it.take(160) })
        Gap(8)
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            g.objs("fav_categories").forEach { c ->
                val on = cat == c.text("value")
                Text(c.text("label"), color = if (on) Color.White else Brand.InkSoft, style = MaterialTheme.typography.labelLarge,
                    modifier = Modifier.clip(RoundedCornerShape(50)).background(if (on) Brand.Blue else Brand.Sky).clickable { cat = c.text("value") }.padding(horizontal = 12.dp, vertical = 7.dp))
            }
        }
        Gap(10)
        Text("Your stars", style = MaterialTheme.typography.labelMedium)
        Row { repeat(5) { i -> IconButton(onClick = { stars = if (stars == i + 1) 0 else i + 1 }) { Icon(if (i < stars) Icons.Outlined.Star else Icons.Outlined.StarBorder, "${i + 1} stars", tint = Color(0xFFF2B01E)) } } }
        Field("Note (what to order, best time…)", note, { note = it.take(600) }, lines = 2)
        Gap(10)
        // photo: yours, or Google's when you found it there
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(84.dp).clip(RoundedCornerShape(16.dp)).background(Brand.Sky), contentAlignment = Alignment.Center) {
                val shown: Any? = photo ?: picked?.str("photo_url")
                if (shown != null) AsyncImage(model = shown, contentDescription = "Photo", contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                else Icon(Icons.Outlined.PhotoCamera, null, tint = Brand.Blue)
            }
            Column(Modifier.padding(start = 10.dp).weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                OutlinedButton(onClick = { try { val u = newPhoto(ctx, "fav"); pending = u; camera.launch(u) } catch (_: Exception) { } }, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Outlined.PhotoCamera, null, Modifier.size(18.dp)); Text("  Take a photo") }
                OutlinedButton(onClick = { gallery.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Outlined.AddPhotoAlternate, null, Modifier.size(18.dp)); Text("  From gallery") }
            }
        }
        Gap(14)
        PrimaryButton("Save to favourites", {
            val f = mutableListOf("kind" to "fav", "title" to name, "category" to cat, "stars" to stars.toString(), "body" to note)
            picked?.let { p ->
                f += listOf("place_id" to p.text("place_id"), "address" to p.text("address"), "maps_url" to p.text("maps_url"), "photo_credit" to p.text("photo_credit"))
                if (p.has("rating") && !p.isNull("rating")) f.add("google_rating" to p.optDouble("rating").toString())
                if (p.has("lat") && !p.isNull("lat")) { f.add("lat" to p.optDouble("lat").toString()); f.add("lng" to p.optDouble("lng").toString()) }
                if (photo == null) p.str("photo")?.let { f.add("google_photo" to it) }
            }
            if (picked == null) spot?.let { (_, la, ln) -> f.add("lat" to la.toString()); f.add("lng" to ln.toString()) }   // pinned where you are
            save(f, photo)
        }, Modifier.fillMaxWidth(), loading = busy, coral = true, enabled = name.isNotBlank() && !busy)
        if (name.isBlank()) Text("Add the place's name to save it.", style = MaterialTheme.typography.labelSmall, color = Brand.Muted, modifier = Modifier.padding(top = 6.dp))
    }
}

/** Travel expenses: total and per person, by category, who paid, settle-up, and the list — add what you spend. */
@Composable
private fun ExpensesSheet(id: Int, g: JSONObject, add: (Map<String, Any?>) -> Unit, delete: (Int) -> Unit) {
    val ex = g.obj("expenses") ?: JSONObject()
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var amount by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var cat by remember { mutableStateOf("food") }
    // a scanned receipt: its photo (kept with the expense), the shop, the day and the items read from it
    var scan by remember { mutableStateOf<JSONObject?>(null) }
    var lines by remember { mutableStateOf<List<Pair<String, Double>>>(emptyList()) }
    var scanning by remember { mutableStateOf(false) }
    var scanMsg by remember { mutableStateOf<String?>(null) }
    var viewing by remember { mutableStateOf<String?>(null) }
    var pendingShot by remember { mutableStateOf<Uri?>(null) }
    fun readReceipt(u: Uri) {
        scanning = true; scanMsg = null
        scope.launch {
            try {
                val small = com.triparro.app.core.shrinkPhoto(ctx, u, "receipt", 2000) ?: throw IllegalStateException("The photo could not be opened.")
                val text = com.triparro.app.core.TextReader.lines(ctx, Uri.fromFile(small.first))?.let { com.triparro.app.core.TextReader.rows(it) } ?: ""
                val r = Api.postMultipart("trip-groups/$id/expenses/receipt", listOf("text" to text), listOf(Upload("photo", small.first, small.second)))
                scan = r
                lines = r.objs("items").map { it.text("name") to it.optDouble("amount") }
                if (!r.isNull("amount") && r.optDouble("amount") > 0) amount = r.optDouble("amount").let { if (it % 1.0 == 0.0) it.toLong().toString() else "%.2f".format(it) }
                r.str("merchant")?.let { if (note.isBlank()) note = it }
                r.str("category")?.let { if (it != "other") cat = it }
                scanMsg = when {
                    r.bool("not_receipt") -> "This doesn't look like a bill — type the amount yourself."
                    r.isNull("amount") -> "Couldn't find the total on this receipt — type the amount. The photo is kept with the expense."
                    r.text("how") == "ai" -> "Read by TripArro AI — check the amount before adding."
                    else -> "Read from the receipt — check the amount before adding."
                }
            } catch (e: Exception) { scanMsg = errorText(e) }
            scanning = false
        }
    }
    val shoot = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { ok -> if (ok) pendingShot?.let { readReceipt(it) } }
    val pick = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { u -> u?.let { readReceipt(it) } }
    var payer by remember { mutableStateOf(g.objs("members").firstOrNull { it.bool("you") }?.int("id") ?: 0) }
    Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 28.dp)) {
        Text("Trip expenses", style = MaterialTheme.typography.titleLarge)
        Row(Modifier.padding(top = 10.dp).fillMaxWidth().clip(RoundedCornerShape(22.dp)).background(Brush.linearGradient(listOf(Color(0xFF1F2430), Color(0xFF3A2440)))).padding(18.dp)) {
            Column(Modifier.weight(1f)) {
                Text("Spent so far", color = Soft, style = MaterialTheme.typography.labelMedium)
                Text(money(ex.optDouble("total")), color = Color.White, fontSize = 30.sp, fontWeight = FontWeight.Bold)
                Text("${ex.int("count")} expenses", color = Soft, style = MaterialTheme.typography.labelSmall)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("Each person", color = Soft, style = MaterialTheme.typography.labelMedium)
                Text(money(ex.optDouble("per_person")), color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            }
        }
        // by category
        val cats = ex.objs("by_category")
        if (cats.isNotEmpty()) {
            Gap(12)
            val palette = listOf(Color(0xFFD7192A), Color(0xFFFFC72C), Color(0xFF5CC29A), Color(0xFF8C9BF2), Color(0xFFFF8A7A), Color(0xFF7CC8F0), Color(0xFFB9A8A0))
            Row(Modifier.fillMaxWidth().height(12.dp).clip(RoundedCornerShape(6.dp))) {
                cats.forEachIndexed { i, c -> if (c.int("pct") > 0) Box(Modifier.weight(c.int("pct").toFloat()).fillMaxHeight().background(palette[i % palette.size])) }
            }
            cats.forEachIndexed { i, c ->
                Row(Modifier.padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(10.dp).clip(CircleShape).background(palette[i % palette.size]))
                    Text(c.text("label"), Modifier.padding(start = 8.dp).weight(1f), style = MaterialTheme.typography.bodyMedium)
                    Text("${money(c.optDouble("amount"))} · ${c.int("pct")}%", style = MaterialTheme.typography.bodyMedium, color = Brand.InkSoft)
                }
            }
        }
        // settle up
        val settle = ex.objs("settle")
        if (settle.isNotEmpty()) {
            Gap(14)
            Text("Settle up", style = MaterialTheme.typography.titleMedium)
            settle.forEach { s ->
                Text("${if (s.bool("you_pay")) "You" else s.text("from")} pay${if (s.bool("you_pay")) "" else "s"} ${if (s.bool("you_get")) "you" else s.text("to")} ${money(s.optDouble("amount"))}",
                    style = MaterialTheme.typography.bodyMedium, color = if (s.bool("you_pay")) Brand.Blue else Brand.Ink, modifier = Modifier.padding(top = 4.dp))
            }
            Text("Everyone's share is the same; pay each other however you like (UPI, cash).", style = MaterialTheme.typography.labelSmall, color = Brand.Muted, modifier = Modifier.padding(top = 4.dp))
        }
        // add
        Gap(16)
        Text("Add an expense", style = MaterialTheme.typography.titleMedium)
        // scan a receipt: the amount, shop and items fill in by themselves
        Row(Modifier.padding(top = 8.dp).fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Brush.linearGradient(listOf(Color(0xFFFFF1EE), Color(0xFFFFF8E8))))
            .border(1.dp, Color(0x22D7192A), RoundedCornerShape(20.dp)).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(52.dp).clip(RoundedCornerShape(14.dp)).background(Brush.linearGradient(listOf(Color(0xFFB3122A), Color(0xFFFF8A3D)))).clickable(enabled = !scanning) { viewing = scan?.str("receipt_url") },
                contentAlignment = Alignment.Center) {
                scan?.str("receipt_url")?.let { AsyncImage(model = it, contentDescription = "Receipt", contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize()) }
                    ?: Icon(Icons.Outlined.Receipt, null, tint = Color.White)
                if (scanning) androidx.compose.material3.CircularProgressIndicator(Modifier.size(26.dp), color = Color.White, strokeWidth = 3.dp)
            }
            Column(Modifier.padding(start = 12.dp).weight(1f)) {
                Text(if (scanning) "Reading the receipt…" else if (scan != null) "Receipt added" else "Scan a receipt", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Text(if (scan != null) "Change anything below before adding." else "Amount, shop and items fill in by themselves.", style = MaterialTheme.typography.labelSmall, color = Brand.InkSoft)
            }
            IconButton(enabled = !scanning, onClick = { try { val u = newPhoto(ctx, "receipt"); pendingShot = u; shoot.launch(u) } catch (_: Exception) { } }) { Icon(Icons.Outlined.PhotoCamera, "Scan with the camera", tint = Brand.Matte) }
            IconButton(enabled = !scanning, onClick = { pick.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }) { Icon(Icons.Outlined.AddPhotoAlternate, "Choose a receipt photo", tint = Brand.Matte) }
        }
        scanMsg?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = if (scan == null) Brand.Matte else Brand.InkSoft, modifier = Modifier.padding(top = 6.dp)) }
        if (lines.isNotEmpty()) Column(Modifier.padding(top = 8.dp).fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color.White).border(1.dp, Brand.Line, RoundedCornerShape(16.dp)).padding(horizontal = 12.dp, vertical = 6.dp)) {
            Text("Items on the receipt", style = MaterialTheme.typography.labelMedium, color = Brand.InkSoft, modifier = Modifier.padding(vertical = 4.dp))
            lines.forEachIndexed { i, (n, a) ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(n, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(money(a), style = MaterialTheme.typography.bodyMedium)
                    IconButton(onClick = { lines = lines.filterIndexed { j, _ -> j != i } }, modifier = Modifier.size(30.dp)) { Icon(Icons.Outlined.Close, "Remove ${n}", tint = Brand.Muted, modifier = Modifier.size(16.dp)) }
                }
            }
        }
        Gap(8)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Field("Amount (₹)", amount, { amount = it.filter { c -> c.isDigit() || c == '.' }.take(10) }, Modifier.weight(1f), keyboard = androidx.compose.ui.text.input.KeyboardType.Decimal)
            Field("For what", note, { note = it.take(160) }, Modifier.weight(1.4f))
        }
        Row(Modifier.padding(top = 8.dp).horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            ex.objs("categories").forEach { c ->
                val on = cat == c.text("value")
                Text(c.text("label"), color = if (on) Color.White else Brand.InkSoft, style = MaterialTheme.typography.labelLarge,
                    modifier = Modifier.clip(RoundedCornerShape(50)).background(if (on) Brand.Blue else Brand.Sky).clickable { cat = c.text("value") }.padding(horizontal = 12.dp, vertical = 7.dp))
            }
        }
        if (g.objs("members").size > 1) {
            Text("Paid by", style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(top = 10.dp))
            Row(Modifier.padding(top = 4.dp).horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                g.objs("members").forEach { m ->
                    val on = payer == m.int("id")
                    Text(if (m.bool("you")) "You" else m.text("name"), color = if (on) Color.White else Brand.InkSoft, style = MaterialTheme.typography.labelLarge,
                        modifier = Modifier.clip(RoundedCornerShape(50)).background(if (on) Brand.Ink else Brand.Sky).clickable { payer = m.int("id") }.padding(horizontal = 12.dp, vertical = 7.dp))
                }
            }
        }
        Gap(10)
        PrimaryButton("Add expense", {
            amount.toDoubleOrNull()?.let { a ->
                val b = mutableMapOf<String, Any?>("amount" to a, "category" to cat, "note" to note, "paid_by" to payer)
                scan?.let { r ->
                    b["receipt"] = r.text("receipt"); r.str("merchant")?.let { b["merchant"] = it }; r.str("date")?.let { b["day"] = it }
                    b["items"] = org.json.JSONArray(lines.map { (n, x) -> JSONObject().put("name", n).put("amount", x) }).toString()
                }
                add(b); amount = ""; note = ""; scan = null; lines = emptyList(); scanMsg = null
            }
        }, Modifier.fillMaxWidth(), coral = true, enabled = (amount.toDoubleOrNull() ?: 0.0) > 0)
        // list
        val items = ex.objs("items")
        if (items.isNotEmpty()) {
            Gap(16)
            Text("All expenses", style = MaterialTheme.typography.titleMedium)
            items.forEach { e ->
                var open by remember { mutableStateOf(false) }
                val el = e.objs("lines")
                Column(Modifier.fillMaxWidth().padding(top = 8.dp).clip(RoundedCornerShape(16.dp)).background(Color.White).border(1.dp, Brand.Line, RoundedCornerShape(16.dp))
                    .clickable(enabled = el.isNotEmpty()) { open = !open }.padding(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        e.str("receipt")?.let { r ->
                            AsyncImage(model = r, contentDescription = "Receipt", contentScale = ContentScale.Crop,
                                modifier = Modifier.padding(end = 10.dp).size(44.dp).clip(RoundedCornerShape(10.dp)).background(Brand.Sky).clickable { viewing = r })
                        }
                        Column(Modifier.weight(1f)) {
                            Text(e.text("note").ifBlank { e.str("merchant") ?: e.text("category_label") }, style = MaterialTheme.typography.titleSmall)
                            Text("${e.text("category_label")} · ${niceDay(e.str("day"))} · paid by ${e.text("paid_by")}" + if (el.isNotEmpty()) " · ${el.size} items" else "",
                                style = MaterialTheme.typography.labelSmall, color = Brand.Muted)
                        }
                        Text(money(e.optDouble("amount")), style = MaterialTheme.typography.titleSmall)
                        if (e.bool("can_delete")) IconButton(onClick = { delete(e.int("id")) }, modifier = Modifier.size(32.dp)) { Icon(Icons.Outlined.Delete, "Delete", tint = Brand.Muted, modifier = Modifier.size(18.dp)) }
                    }
                    if (open) el.forEach { l ->
                        Row(Modifier.padding(top = 4.dp)) {
                            Text(l.text("name"), Modifier.weight(1f), style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
                            Text(money(l.optDouble("amount")), style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
                        }
                    }
                }
            }
        }
    }
    viewing?.let { ReceiptViewer(it) { viewing = null } }
}

@Composable
private fun ReceiptViewer(url: String, onClose: () -> Unit) {
    androidx.compose.ui.window.Dialog(onDismissRequest = onClose, properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false)) {
        Box(Modifier.fillMaxSize().background(Color(0xF0000000)).clickable(onClick = onClose), contentAlignment = Alignment.Center) {
            AsyncImage(model = url, contentDescription = "Receipt", contentScale = ContentScale.Fit, modifier = Modifier.fillMaxSize().padding(12.dp))
            Icon(Icons.Outlined.Close, "Close", tint = Color.White, modifier = Modifier.align(Alignment.TopEnd).padding(20.dp).size(28.dp))
        }
    }
}

@Composable
private fun ChecklistSheet(g: JSONObject, add: (String) -> Unit, toggle: (Int) -> Unit, delete: (Int) -> Unit) {
    var t by remember { mutableStateOf("") }
    val todos = g.objs("items").filter { it.text("kind") == "todo" }
    SheetList("Trip checklist", "${todos.count { it.bool("done") }} of ${todos.size} done — everyone in the trip can tick things off") {
        todos.forEach { item ->
            Row(Modifier.fillMaxWidth().clickable { toggle(item.int("id")) }.padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(if (item.bool("done")) Icons.Outlined.TaskAlt else Icons.Outlined.Add, null, tint = if (item.bool("done")) Brand.Teal else Brand.Muted)
                Column(Modifier.padding(start = 10.dp).weight(1f)) {
                    Text(item.text("title"), style = MaterialTheme.typography.bodyLarge, textDecoration = if (item.bool("done")) androidx.compose.ui.text.style.TextDecoration.LineThrough else null)
                    Text("by " + item.text("by"), style = MaterialTheme.typography.labelSmall, color = Brand.Muted)
                }
                if (item.bool("can_delete")) IconButton(onClick = { delete(item.int("id")) }) { Icon(Icons.Outlined.Delete, "Delete", tint = Brand.Muted) }
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Field("Add to the checklist", t, { t = it.take(160) }, Modifier.weight(1f), placeholder = "Pack sweaters, book a cab…")
            IconButton(onClick = { if (t.isNotBlank()) { add(t.trim()); t = "" } }) { Icon(Icons.Outlined.Add, "Add", tint = Brand.Blue) }
        }
    }
}

@Composable
private fun PeopleSheet(g: JSONObject, ctx: Context, newCode: () -> Unit, remove: (Int) -> Unit, leave: (String) -> Unit) {
    var confirm by remember { mutableStateOf(false) }
    val members = g.objs("members")
    val delete = g.bool("owner") && members.size == 1
    SheetList("Who's going", "${members.size} joined") {
        members.forEach { m ->
            Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Avatars(listOf(m.text("initial")), 42.dp)
                Column(Modifier.padding(start = 12.dp).weight(1f)) {
                    Text(m.text("name") + if (m.bool("you")) " (you)" else "", style = MaterialTheme.typography.titleSmall)
                    Text(listOf(if (m.text("role") == "owner") "Made the trip" else "Joined " + m.text("joined"), m.text("relation").replaceFirstChar { it.uppercase() }).filter { it.isNotBlank() }.joinToString(" · "),
                        style = MaterialTheme.typography.labelSmall, color = Brand.Muted)
                }
                if (g.bool("owner") && !m.bool("you")) TextButton(onClick = { remove(m.int("id")) }) { Text("Remove") }
            }
        }
        // invited by email, not joined yet
        g.objs("invited").takeIf { it.isNotEmpty() }?.let { inv ->
            Text("Invited", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 8.dp))
            inv.forEach { i ->
                Row(Modifier.padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(42.dp).clip(CircleShape).background(Brand.Sky), contentAlignment = Alignment.Center) { Icon(Icons.Outlined.PersonAdd, null, tint = Brand.Blue) }
                    Column(Modifier.padding(start = 12.dp)) {
                        Text(i.text("who"), style = MaterialTheme.typography.titleSmall)
                        Text(if (i.bool("on_triparro")) "Invited in the app — not joined yet" else "Link sent by email — not joined yet", style = MaterialTheme.typography.labelSmall, color = Brand.Muted)
                    }
                }
            }
        }
        Gap()
        InviteCard(g, ctx, newCode)
        Gap()
        OutlinedButton(onClick = { confirm = true }, modifier = Modifier.fillMaxWidth()) { Text(if (delete) "Delete this trip" else "Leave this trip") }
    }
    if (confirm) AlertDialog(onDismissRequest = { confirm = false }, title = { Text(if (delete) "Delete this trip?" else "Leave this trip?") },
        text = { Text(if (delete) "The plan, favourites, expenses and chat are deleted for good." else "You can join again with the invite.") },
        confirmButton = { TextButton(onClick = { confirm = false; leave(if (delete) "delete" else "leave") }) { Text(if (delete) "Delete" else "Leave") } },
        dismissButton = { TextButton(onClick = { confirm = false }) { Text("Cancel") } })
}
