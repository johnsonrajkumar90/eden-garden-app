@file:OptIn(ExperimentalMaterial3Api::class)

package com.triparro.app.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DateRangePicker
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SelectableDates
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDateRangePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

fun today(): String = LocalDate.now().toString()
fun addDays(iso: String, n: Long): String = try { LocalDate.parse(iso).plusDays(n).toString() } catch (_: Exception) { iso }

private fun isoToMillis(iso: String?): Long? = try { iso?.let { LocalDate.parse(it).atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli() } } catch (_: Exception) { null }
private fun millisToIso(ms: Long?): String? = ms?.let { Instant.ofEpochMilli(it).atZone(ZoneOffset.UTC).toLocalDate().toString() }

/** A "Check-in → Check-out" field that opens a date-range calendar (no past dates). */
@Composable
fun DateRangeField(checkIn: String, checkOut: String, onChange: (String, String) -> Unit, modifier: Modifier = Modifier, label: String = "Dates") {
    var open by remember { mutableStateOf(false) }
    Bordered(modifier.clickable { open = true }) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Outlined.CalendarMonth, null, tint = Brand.Teal, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(10.dp))
            Column {
                Text(label, style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                Text(if (checkIn.isEmpty()) "Add dates" else "${shortDate(checkIn)} → ${if (checkOut.isEmpty()) "…" else shortDate(checkOut)}",
                    style = MaterialTheme.typography.titleSmall)
            }
        }
    }
    if (open) {
        val todayMs = isoToMillis(today()) ?: 0L
        val state = rememberDateRangePickerState(
            initialSelectedStartDateMillis = isoToMillis(checkIn.ifEmpty { null }),
            initialSelectedEndDateMillis = isoToMillis(checkOut.ifEmpty { null }),
            selectableDates = object : SelectableDates {
                override fun isSelectableDate(utcTimeMillis: Long): Boolean = utcTimeMillis >= todayMs
            },
        )
        DatePickerDialog(
            onDismissRequest = { open = false },
            confirmButton = {
                TextButton(enabled = state.selectedStartDateMillis != null, onClick = {
                    val a = millisToIso(state.selectedStartDateMillis) ?: ""
                    val b = millisToIso(state.selectedEndDateMillis) ?: addDays(a, 1)
                    onChange(a, if (b <= a) addDays(a, 1) else b)
                    open = false
                }) { Text("Done") }
            },
            dismissButton = { TextButton(onClick = { open = false }) { Text("Cancel") } },
        ) {
            DateRangePicker(state = state, modifier = Modifier.height(520.dp), title = { Text("Check-in and check-out", Modifier.padding(start = 24.dp, top = 16.dp)) })
        }
    }
}

@Composable
fun Stepper(label: String, value: Int, onChange: (Int) -> Unit, min: Int = 0, max: Int = 20, note: String? = null) {
    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(label, style = MaterialTheme.typography.titleSmall)
            if (note != null) Text(note, style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
        }
        FilledTonalIconButton(onClick = { if (value > min) onChange(value - 1) }, enabled = value > min, modifier = Modifier.size(36.dp)) { Icon(Icons.Filled.Remove, "Less") }
        Text("$value", style = MaterialTheme.typography.titleMedium, modifier = Modifier.width(40.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        FilledTonalIconButton(onClick = { if (value < max) onChange(value + 1) }, enabled = value < max, modifier = Modifier.size(36.dp)) { Icon(Icons.Filled.Add, "More") }
    }
}

@Composable
fun Field(label: String, value: String, onChange: (String) -> Unit, modifier: Modifier = Modifier, error: String? = null, lines: Int = 1,
          keyboard: KeyboardType = KeyboardType.Text, password: Boolean = false, placeholder: String? = null) {
    OutlinedTextField(
        value = value, onValueChange = onChange, label = { Text(label) }, modifier = modifier.fillMaxWidth(),
        singleLine = lines == 1, minLines = lines, isError = error != null, shape = RoundedCornerShape(12.dp),
        supportingText = error?.let { { Text(it) } }, placeholder = placeholder?.let { { Text(it) } },
        keyboardOptions = KeyboardOptions(keyboardType = keyboard),
        visualTransformation = if (password) PasswordVisualTransformation() else androidx.compose.ui.text.input.VisualTransformation.None,
    )
}

@Composable
fun CheckRow(text: String, checked: Boolean, onChange: (Boolean) -> Unit, note: String? = null) {
    Row(Modifier.fillMaxWidth().clickable { onChange(!checked) }.padding(vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
        Checkbox(checked = checked, onCheckedChange = onChange)
        Column(Modifier.weight(1f)) {
            Text(text, style = MaterialTheme.typography.bodyMedium)
            if (note != null) Text(note, style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
        }
    }
}

/** A drop-down of (value, label) options. */
@Composable
fun Choice(label: String, value: String, options: List<Pair<String, String>>, onChange: (String) -> Unit, modifier: Modifier = Modifier) {
    var open by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(expanded = open, onExpandedChange = { open = it }, modifier = modifier) {
        OutlinedTextField(
            value = options.firstOrNull { it.first == value }?.second ?: value, onValueChange = {}, readOnly = true, label = { Text(label) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = open) }, shape = RoundedCornerShape(12.dp),
            modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable).fillMaxWidth(),
        )
        ExposedDropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            options.forEach { (v, l) -> DropdownMenuItem(text = { Text(l) }, onClick = { onChange(v); open = false }) }
        }
    }
}

@Composable
fun Segmented(options: List<Pair<String, String>>, value: String, onChange: (String) -> Unit) {
    SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
        options.forEachIndexed { i, (v, l) ->
            SegmentedButton(
                selected = v == value, onClick = { onChange(v) },
                shape = SegmentedButtonDefaults.itemShape(index = i, count = options.size),
            ) { Text(l, maxLines = 1) }
        }
    }
}

@Composable
fun Gap(h: Int = 12) = Spacer(Modifier.height(h.dp))
