'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Employee,
  PayrollRecord,
  MonthlySummary,
  CompanySummary,
  DashboardStats,
  FilterOptions,
  Theme
} from '@/types'
import { sampleEmployees, samplePayrollRecords, generateDashboardStats } from '@/data/sampleData'

interface AppState {
  // Theme
  theme: Theme
  setTheme: (theme: Theme) => void

  // Data
  employees: Employee[]
  payrollRecords: PayrollRecord[]
  monthlySummaries: MonthlySummary[]
  companySummaries: CompanySummary[]
  dashboardStats: DashboardStats | null

  // Filters
  filters: FilterOptions
  setFilters: (filters: FilterOptions) => void
  clearFilters: () => void

  // Selected period
  selectedPeriod: string
  setSelectedPeriod: (period: string) => void
  availablePeriods: string[]

  // Loading states
  isLoading: boolean
  setIsLoading: (loading: boolean) => void

  // Actions
  loadSampleData: () => void
  addPayrollRecords: (records: PayrollRecord[]) => void
  updateEmployee: (employee: Employee) => void
  deleteEmployee: (id: string) => void
  calculateMonthlySummary: (period: string) => MonthlySummary | null
  refreshDashboardStats: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Theme - default to dark
      theme: 'dark',
      setTheme: (theme) => set({ theme }),

      // Data
      employees: [],
      payrollRecords: [],
      monthlySummaries: [],
      companySummaries: [],
      dashboardStats: null,

      // Filters
      filters: {},
      setFilters: (filters) => set({ filters }),
      clearFilters: () => set({ filters: {} }),

      // Selected period
      selectedPeriod: '',
      setSelectedPeriod: (period) => set({ selectedPeriod: period }),
      availablePeriods: [],

      // Loading
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),

      // Actions
      loadSampleData: () => {
        const employees = sampleEmployees
        const payrollRecords = samplePayrollRecords
        const periods = Array.from(new Set(payrollRecords.map(r => r.period))).sort().reverse()
        const selectedPeriod = periods[0] || '2025年1月'
        const dashboardStats = generateDashboardStats(employees, payrollRecords)

        set({
          employees,
          payrollRecords,
          availablePeriods: periods,
          selectedPeriod,
          dashboardStats,
        })
      },

      addPayrollRecords: (records) => {
        const currentRecords = get().payrollRecords
        const newRecords = [...currentRecords, ...records]
        const periods = Array.from(new Set(newRecords.map(r => r.period))).sort().reverse()

        set({
          payrollRecords: newRecords,
          availablePeriods: periods,
        })

        get().refreshDashboardStats()
      },

      updateEmployee: (employee) => {
        const employees = get().employees.map(e =>
          e.id === employee.id ? employee : e
        )
        set({ employees })
        get().refreshDashboardStats()
      },

      deleteEmployee: (id) => {
        const employees = get().employees.filter(e => e.id !== id)
        set({ employees })
        get().refreshDashboardStats()
      },

      calculateMonthlySummary: (period) => {
        const { employees, payrollRecords } = get()
        const periodRecords = payrollRecords.filter(r => r.period === period)

        if (periodRecords.length === 0) return null

        const summary: MonthlySummary = {
          period,
          year: parseInt(period.match(/(\d{4})年/)?.[1] || '2025'),
          month: parseInt(period.match(/(\d{1,2})月/)?.[1] || '1'),
          totalEmployees: periodRecords.length,
          totalRevenue: periodRecords.reduce((sum, r) => sum + r.billingAmount, 0),
          totalSalaryCost: periodRecords.reduce((sum, r) => sum + r.grossSalary, 0),
          totalSocialInsurance: periodRecords.reduce((sum, r) => sum + r.companySocialInsurance, 0),
          totalEmploymentInsurance: periodRecords.reduce((sum, r) => sum + r.companyEmploymentInsurance, 0),
          totalPaidLeaveCost: periodRecords.reduce((sum, r) => sum + (r.paidLeaveHours * (employees.find(e => e.employeeId === r.employeeId)?.hourlyRate || 0)), 0),
          totalTransportCost: periodRecords.reduce((sum, r) => sum + r.transportAllowance, 0),
          totalCompanyCost: periodRecords.reduce((sum, r) => sum + r.totalCompanyCost, 0),
          totalGrossProfit: periodRecords.reduce((sum, r) => sum + r.grossProfit, 0),
          averageMargin: periodRecords.reduce((sum, r) => sum + r.profitMargin, 0) / periodRecords.length,
          topProfitEmployees: periodRecords
            .sort((a, b) => b.grossProfit - a.grossProfit)
            .slice(0, 5)
            .map(r => ({
              employeeId: r.employeeId,
              name: employees.find(e => e.employeeId === r.employeeId)?.name || '',
              profit: r.grossProfit,
            })),
          bottomProfitEmployees: periodRecords
            .sort((a, b) => a.grossProfit - b.grossProfit)
            .slice(0, 5)
            .map(r => ({
              employeeId: r.employeeId,
              name: employees.find(e => e.employeeId === r.employeeId)?.name || '',
              profit: r.grossProfit,
            })),
        }

        return summary
      },

      refreshDashboardStats: () => {
        const { employees, payrollRecords } = get()
        const dashboardStats = generateDashboardStats(employees, payrollRecords)
        set({ dashboardStats })
      },
    }),
    {
      name: 'arari-pro-storage',
      partialize: (state) => ({
        theme: state.theme,
        employees: state.employees,
        payrollRecords: state.payrollRecords,
        selectedPeriod: state.selectedPeriod,
      }),
    }
  )
)
