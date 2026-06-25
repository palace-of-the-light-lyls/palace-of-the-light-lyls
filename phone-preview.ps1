param(
  [int]$Port = 8765,
  [string]$Root = $PSScriptRoot
)

$mimeTypes = @{
  '.css'  = 'text/css; charset=utf-8'
  '.gif'  = 'image/gif'
  '.html' = 'text/html; charset=utf-8'
  '.ico'  = 'image/x-icon'
  '.jpeg' = 'image/jpeg'
  '.jpg'  = 'image/jpeg'
  '.js'   = 'text/javascript; charset=utf-8'
  '.mp4'  = 'video/mp4'
  '.png'  = 'image/png'
  '.svg'  = 'image/svg+xml'
  '.webp' = 'image/webp'
}

$rootPath = [System.IO.Path]::GetFullPath($Root).TrimEnd('\')
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
$listener.Start()

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $stream.ReadTimeout = 5000
      $buffer = [byte[]]::new(4096)
      $requestBytes = [System.Collections.Generic.List[byte]]::new()
      $headerEnd = [byte[]](13, 10, 13, 10)

      while ($requestBytes.Count -lt 16384) {
        $read = $stream.Read($buffer, 0, $buffer.Length)
        if ($read -le 0) {
          break
        }
        for ($index = 0; $index -lt $read; $index++) {
          $requestBytes.Add($buffer[$index])
        }

        if ($requestBytes.Count -ge 4) {
          $last = $requestBytes.Count - 4
          if ($requestBytes[$last] -eq $headerEnd[0] -and
              $requestBytes[$last + 1] -eq $headerEnd[1] -and
              $requestBytes[$last + 2] -eq $headerEnd[2] -and
              $requestBytes[$last + 3] -eq $headerEnd[3]) {
            break
          }
        }
      }

      $requestText = [System.Text.Encoding]::ASCII.GetString($requestBytes.ToArray())
      $requestLine = ($requestText -split "`r`n", 2)[0]

      if (-not $requestLine -or $requestLine -notmatch '^GET\s+(\S+)\s+HTTP/') {
        continue
      }

      $requestPath = ($matches[1] -split '\?')[0]
      $relativePath = [System.Uri]::UnescapeDataString($requestPath.TrimStart('/'))
      if ([string]::IsNullOrWhiteSpace($relativePath)) {
        $relativePath = 'index.html'
      }

      $requestedPath = [System.IO.Path]::GetFullPath((Join-Path $rootPath $relativePath.Replace('/', '\')))
      if (-not $requestedPath.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase) -or
          -not [System.IO.File]::Exists($requestedPath)) {
        $body = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
        $header = "HTTP/1.1 404 Not Found`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
      } else {
        $body = [System.IO.File]::ReadAllBytes($requestedPath)
        $extension = [System.IO.Path]::GetExtension($requestedPath).ToLowerInvariant()
        $contentType = if ($mimeTypes.ContainsKey($extension)) {
          $mimeTypes[$extension]
        } else {
          'application/octet-stream'
        }
        $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
      }

      $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
      $stream.Write($headerBytes, 0, $headerBytes.Length)
      $stream.Write($body, 0, $body.Length)
      $stream.Flush()
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
