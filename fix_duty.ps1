$f = "c:\Projects\tgp_coreschemas\src\pages\admin\CalendarManagement.jsx"
$lines = [System.IO.File]::ReadAllLines($f)
$insert = @(
  "",
  "  const loadDutySummary = useCallback(async () => {",
  "    try {",
  '      const { data: activeSemester } = await supabase',
  '        .from("semesters")',
  '        .select("id")',
  '        .eq("is_active", true)',
  '        .maybeSingle();',
  "      if (!activeSemester) { setDutyBlackouts([]); return; }",
  '      const { data } = await supabase',
  '        .from("duty_schedule_blackout_dates")',
  '        .select("id, blackout_date, reason")',
  '        .eq("semester_id", activeSemester.id)',
  '        .order("blackout_date", { ascending: true });',
  "      setDutyBlackouts(data || []);",
  "    } catch {",
  "      // silently ignore",
  "    }",
  "  }, []);"
)
$kept = $lines[0..131] + $insert + $lines[132..($lines.Length - 1)]
[System.IO.File]::WriteAllLines($f, [string[]]$kept)
Write-Host "Done. Lines: $($kept.Count)"
