'use client'

import { useEffect, useState } from 'react'
import { X, User, Building2, Calendar, TrendingUp, DollarSign } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatYen, formatPercent, getProfitBgColor, comparePeriods } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'
import type { Employee, PayrollRecord } from '@/types'

interface EmployeeDetailModalProps {
  employee: Employee
  isOpen: boolean
  onClose: () => void
}

export function EmployeeDetailModal({ employee, isOpen, onClose }: EmployeeDetailModalProps) {
  const { payrollRecords, useBackend, loadDataFromBackend } = useAppStore()
  const [employeeRecords, setEmployeeRecords] = useState<PayrollRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && employee) {
      // Load payroll data if using backend
      if (useBackend && payrollRecords.length === 0) {
        loadDataFromBackend().finally(() => setLoading(false))
      } else {
        setLoading(false)
      }

      // Filter records for this employee and sort by period (newest first)
      // Use comparePeriods to handle 2025年10月 > 2025年9月 correctly
      const records = payrollRecords
        .filter(r => r.employeeId === employee.employeeId)
        .sort((a, b) => comparePeriods(b.period, a.period))

      setEmployeeRecords(records)
    }
  }, [isOpen, employee, payrollRecords, useBackend, loadDataFromBackend])

  if (!isOpen) return null

  const profit = employee.billingRate - employee.hourlyRate
  const margin = (profit / employee.billingRate) * 100

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl bg-background shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-500 to-purple-600">
              <div className="flex items-center gap-4 text-white">
                <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{employee.name}</h2>
                  <p className="text-sm opacity-90">{employee.nameKana}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-88px)]">
              <div className="p-6 space-y-6">
                {/* Employee Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      基本情報
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">社員ID</p>
                      <p className="font-mono font-semibold">{employee.employeeId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">派遣先</p>
                      <p className="font-medium">{employee.dispatchCompany}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">時給</p>
                      <p className="font-semibold">{formatYen(employee.hourlyRate)}/h</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">単価</p>
                      <p className="font-semibold">{formatYen(employee.billingRate)}/h</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">粗利/時間</p>
                      <p className="font-semibold text-emerald-500">{formatYen(profit)}/h</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">マージン率</p>
                      <Badge className={getProfitBgColor(margin)}>
                        {formatPercent(margin)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">状態</p>
                      <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                        {employee.status === 'active' ? '在職中' : '退職'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">入社日</p>
                      <p className="text-sm">{new Date(employee.hireDate).toLocaleDateString('ja-JP')}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Payroll Records */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      給料明細 ({employeeRecords.length}期間)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        データを読み込み中...
                      </div>
                    ) : employeeRecords.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        給料明細データがありません
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-2">期間</th>
                              <th className="text-right py-3 px-2">勤務日数</th>
                              <th className="text-right py-3 px-2">労働時間</th>
                              <th className="text-right py-3 px-2">残業</th>
                              <th className="text-right py-3 px-2">有給日数</th>
                              <th className="text-right py-3 px-2">総支給額</th>
                              <th className="text-right py-3 px-2">請求金額</th>
                              <th className="text-right py-3 px-2">粗利</th>
                              <th className="text-right py-3 px-2">率</th>
                            </tr>
                          </thead>
                          <tbody>
                            {employeeRecords.map((record) => {
                              const recordMargin = record.billingAmount > 0
                                ? (record.grossProfit / record.billingAmount) * 100
                                : 0

                              return (
                                <tr key={record.id} className="border-b hover:bg-muted/50 transition-colors">
                                  <td className="py-3 px-2 font-medium">{record.period}</td>
                                  <td className="text-right py-3 px-2">{record.workDays || '-'}日</td>
                                  <td className="text-right py-3 px-2">{record.workHours?.toFixed(1) || '-'}h</td>
                                  <td className="text-right py-3 px-2">
                                    {record.overtimeHours ? `${record.overtimeHours.toFixed(1)}h` : '-'}
                                  </td>
                                  <td className="text-right py-3 px-2">
                                    {record.paidLeaveDays ? `${record.paidLeaveDays}日` : '-'}
                                  </td>
                                  <td className="text-right py-3 px-2 font-medium">
                                    {formatYen(record.grossSalary)}
                                  </td>
                                  <td className="text-right py-3 px-2 font-semibold text-blue-600">
                                    {formatYen(record.billingAmount)}
                                  </td>
                                  <td className="text-right py-3 px-2 font-semibold text-emerald-600">
                                    {formatYen(record.grossProfit)}
                                  </td>
                                  <td className="text-right py-3 px-2">
                                    <Badge className={getProfitBgColor(recordMargin)} variant="outline">
                                      {formatPercent(recordMargin)}
                                    </Badge>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          {employeeRecords.length > 0 && (
                            <tfoot className="bg-muted/50 font-semibold">
                              <tr>
                                <td className="py-3 px-2">合計</td>
                                <td className="text-right py-3 px-2">
                                  {employeeRecords.reduce((sum, r) => sum + (r.workDays || 0), 0)}日
                                </td>
                                <td className="text-right py-3 px-2">
                                  {employeeRecords.reduce((sum, r) => sum + (r.workHours || 0), 0).toFixed(1)}h
                                </td>
                                <td className="text-right py-3 px-2">
                                  {employeeRecords.reduce((sum, r) => sum + (r.overtimeHours || 0), 0).toFixed(1)}h
                                </td>
                                <td className="text-right py-3 px-2">
                                  {employeeRecords.reduce((sum, r) => sum + (r.paidLeaveDays || 0), 0)}日
                                </td>
                                <td className="text-right py-3 px-2">
                                  {formatYen(employeeRecords.reduce((sum, r) => sum + r.grossSalary, 0))}
                                </td>
                                <td className="text-right py-3 px-2 text-blue-600">
                                  {formatYen(employeeRecords.reduce((sum, r) => sum + r.billingAmount, 0))}
                                </td>
                                <td className="text-right py-3 px-2 text-emerald-600">
                                  {formatYen(employeeRecords.reduce((sum, r) => sum + r.grossProfit, 0))}
                                </td>
                                <td className="text-right py-3 px-2">
                                  <Badge className={getProfitBgColor(margin)}>
                                    {formatPercent(margin)}
                                  </Badge>
                                </td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
