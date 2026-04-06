Add-Type -AssemblyName System.IO.Compression.FileSystem
$docxPath = $args[0]
$outputPath = $args[1]

$zip = [System.IO.Compression.ZipFile]::OpenRead($docxPath)
$entry = $zip.GetEntry('word/document.xml')
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$xml = $reader.ReadToEnd()
$reader.Close()
$stream.Close()
$zip.Dispose()

$text = [regex]::Replace($xml, '<[^>]+>', ' ')
$text = $text.Replace('&quot;', '"').Replace('&amp;', '&').Replace('&lt;', '<').Replace('&gt;', '>')
$text = $text -replace '\s+', ' '

$text | Out-File -FilePath $outputPath -Encoding utf8
