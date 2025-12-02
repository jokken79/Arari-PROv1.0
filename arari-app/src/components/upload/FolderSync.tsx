'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Folder, Play, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'

export function FolderSync() {
  const [folderPath, setFolderPath] = useState('D:\\給料明細')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const { refreshFromBackend } = useAppStore()

  const handleSync = async () => {
    if (!folderPath.trim()) {
      setError('フォルダパスを入力してください')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/sync-from-folder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folder_path: folderPath,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.detail || 'エラーが発生しました')
        setResult(null)
      } else {
        setResult(data)
        if (data.total_records_saved > 0 || data.files_processed > 0) {
          // Refresh data from backend
          await refreshFromBackend()
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ネットワークエラー')
      setResult(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSync()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-primary" />
            フォルダから同期
          </CardTitle>
          <CardDescription>
            フォルダパスを指定して、すべての .xlsm ファイルを自動でアップロード
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">フォルダパス</label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="例: D:\給料明細"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSync}
                disabled={isLoading || !folderPath.trim()}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    処理中...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    同期開始
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20"
            >
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-500">エラー</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </motion.div>
          )}

          {/* Success Result */}
          {result && result.status === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
            >
              <div className="flex gap-3 items-start">
                <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-medium text-emerald-500">同期完了</p>
                  <p className="text-sm text-emerald-600">{result.message}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                  <p className="text-xs text-emerald-600/70">見つかったファイル</p>
                  <p className="text-lg font-bold text-emerald-600">{result.files_found}</p>
                </div>
                <div className="bg-blue-500/5 p-3 rounded-lg border border-blue-500/10">
                  <p className="text-xs text-blue-600/70">処理済みファイル</p>
                  <p className="text-lg font-bold text-blue-600">{result.files_processed}</p>
                </div>
                <div className="bg-green-500/5 p-3 rounded-lg border border-green-500/10">
                  <p className="text-xs text-green-600/70">保存済みレコード</p>
                  <p className="text-lg font-bold text-green-600">{result.total_records_saved}</p>
                </div>
                <div className="bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
                  <p className="text-xs text-amber-600/70">エラー</p>
                  <p className="text-lg font-bold text-amber-600">{result.total_errors}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Error Result */}
          {result && result.status === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20"
            >
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-500">情報</p>
                <p className="text-sm text-amber-600">{result.message}</p>
              </div>
            </motion.div>
          )}

          {/* Tips */}
          <div className="bg-blue-500/5 p-4 rounded-lg border border-blue-500/10 space-y-2">
            <p className="text-sm font-medium text-blue-600">使い方:</p>
            <ul className="text-sm text-blue-600/70 space-y-1 ml-4">
              <li>1. フォルダパスを入力 (例: D:\給料明細)</li>
              <li>2. 「同期開始」ボタンをクリック</li>
              <li>3. すべての .xlsm ファイルが自動でアップロードされます</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
