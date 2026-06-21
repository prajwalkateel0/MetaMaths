import React, { createContext, useContext, useReducer } from 'react'

const ProblemsStateContext = createContext(null)
const ProblemsDispatchContext = createContext(null)

const initialState = {
 counter:0,
 problems: [
 { id:1, title: 'Sum of two numbers', solved: false, difficulty: 'Easy' },
 { id:2, title: 'Prime check', solved: false, difficulty: 'Medium' }
 ]
}

function reducer(state, action) {
 switch (action.type) {
 case 'addProblem':
 return { ...state, problems: [...state.problems, action.payload] }
 case 'removeProblem':
 return { ...state, problems: state.problems.filter(p => p.id !== action.payload) }
 case 'toggleSolved':
 return {
 ...state,
 problems: state.problems.map(p => (p.id === action.payload ? { ...p, solved: !p.solved } : p))
 }
 case 'increment':
 return { ...state, counter: state.counter +1 }
 case 'decrement':
 return { ...state, counter: state.counter -1 }
 default:
 throw new Error(`Unknown action: ${action.type}`)
 }
}

export function ProblemsProvider({ children }) {
 const [state, dispatch] = useReducer(reducer, initialState)
 return (
 <ProblemsStateContext.Provider value={state}>
 <ProblemsDispatchContext.Provider value={dispatch}>
 {children}
 </ProblemsDispatchContext.Provider>
 </ProblemsStateContext.Provider>
 )
}

export function useProblemsState() {
 const context = useContext(ProblemsStateContext)
 if (context === null) throw new Error('useProblemsState must be used within ProblemsProvider')
 return context
}

export function useProblemsDispatch() {
 const context = useContext(ProblemsDispatchContext)
 if (context === null) throw new Error('useProblemsDispatch must be used within ProblemsProvider')
 return context
}

export function useProblems() {
 return [useProblemsState(), useProblemsDispatch()]
}
