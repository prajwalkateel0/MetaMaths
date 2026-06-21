import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Toast from './components/ui/Toast'
import ProtectedRoute from './components/layout/ProtectedRoute'

// Auth pages
import Landing from './pages/Landing'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import VerifyEmail from './pages/auth/VerifyEmail'

// Teacher pages
import TeacherDashboard from './pages/teacher/Dashboard'
import TeacherDatasets from './pages/teacher/Datasets'
import DatasetDetail from './pages/teacher/DatasetDetail'
import DatasetNew from './pages/teacher/DatasetNew'
import TeacherCharts from './pages/teacher/Charts'
import ChartBuilder from './pages/teacher/ChartBuilder'
import TeacherQuizzes from './pages/teacher/Quizzes'
import QuizBuilder from './pages/teacher/QuizBuilder'
import TeacherClassrooms from './pages/teacher/Classrooms'
import ClassroomDetail from './pages/teacher/ClassroomDetail'
import TeacherSession from './pages/teacher/Session'
import TeacherSessionResults from './pages/teacher/SessionResults'
import TeacherAnalytics from './pages/teacher/Analytics'
import Lessons from './pages/teacher/Lessons'
import LessonDetail from './pages/teacher/LessonDetail'
import ChartTemplates from './pages/teacher/ChartTemplates'

// Student pages
import StudentDashboard from './pages/student/Dashboard'
import StudentClassrooms from './pages/student/Classrooms'
import StudentClassroomDetail from './pages/student/ClassroomDetail'
import StudentSession from './pages/student/Session'
import StudentSessionReview from './pages/student/SessionReview'
import StudentResults from './pages/student/Results'
import StudentPractice from './pages/student/Practice'
import StudentLessonView from './pages/student/LessonView'

// Admin pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminUsers from './pages/admin/Users'
import AdminDataSources from './pages/admin/DataSources'
import AdminAudit from './pages/admin/Audit'

import NotFound from './pages/NotFound'
import Profile from './pages/Profile'

export default function App() {
  const { fetchMe, accessToken } = useAuthStore()

  useEffect(() => {
    if (accessToken) fetchMe()
  }, [])

  return (
    <BrowserRouter>
      <Toast />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Teacher routes */}
        <Route path="/t" element={<ProtectedRoute role="teacher" />}>
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="datasets" element={<TeacherDatasets />} />
          <Route path="datasets/new" element={<DatasetNew />} />
          <Route path="datasets/:id" element={<DatasetDetail />} />
          <Route path="charts" element={<TeacherCharts />} />
          <Route path="charts/builder" element={<ChartBuilder />} />
          <Route path="charts/builder/:id" element={<ChartBuilder />} />
          <Route path="quizzes" element={<TeacherQuizzes />} />
          <Route path="quizzes/builder" element={<QuizBuilder />} />
          <Route path="quizzes/builder/:id" element={<QuizBuilder />} />
          <Route path="classrooms" element={<TeacherClassrooms />} />
          <Route path="classrooms/:id" element={<ClassroomDetail />} />
          <Route path="sessions/:id" element={<TeacherSession />} />
          <Route path="sessions/:id/results" element={<TeacherSessionResults />} />
          <Route path="analytics" element={<TeacherAnalytics />} />
          <Route path="lessons" element={<Lessons />} />
          <Route path="lessons/:topic" element={<LessonDetail />} />
          <Route path="chart-templates" element={<ChartTemplates />} />
        </Route>

        {/* Student routes */}
        <Route path="/s" element={<ProtectedRoute role="student" />}>
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="classrooms" element={<StudentClassrooms />} />
          <Route path="classrooms/:id" element={<StudentClassroomDetail />} />
          <Route path="sessions/:id" element={<StudentSession />} />
          <Route path="sessions/:id/review" element={<StudentSessionReview />} />
          <Route path="results" element={<StudentResults />} />
          <Route path="practice" element={<StudentPractice />} />
          <Route path="lessons/:topic" element={<StudentLessonView />} />
        </Route>

        {/* Admin routes */}
        <Route path="/admin" element={<ProtectedRoute role="admin" />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="data-sources" element={<AdminDataSources />} />
          <Route path="audit" element={<AdminAudit />} />
        </Route>

        {/* Shared */}
        <Route path="/profile" element={<ProtectedRoute role="any"><Profile /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
