import React from 'react'
import { useProblemsState, useProblemsDispatch } from '../context/ProblemsContext'

export default function ProblemList(){
 const { problems } = useProblemsState()
 const dispatch = useProblemsDispatch()

 function toggle(id){
 dispatch({ type: 'toggleSolved', payload: id })
 }

 return (
 <section>
 <h2>Problems</h2>
 <ul>
 {problems.map(p => (
 <li key={p.id}>
 <strong>{p.title}</strong> - {p.difficulty} - {p.solved ? 'Solved' : 'Unsolved'}
 <button onClick={() => toggle(p.id)} style={{marginLeft:8}}>{p.solved ? 'Mark unsolved' : 'Mark solved'}</button>
 </li>
 ))}
 </ul>
 </section>
 )
}
