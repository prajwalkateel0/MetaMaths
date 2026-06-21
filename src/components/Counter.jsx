import React from 'react'
import { useProblemsState, useProblemsDispatch } from '../context/ProblemsContext'

export default function Counter(){
 const { counter } = useProblemsState()
 const dispatch = useProblemsDispatch()
 return (
 <div style={{marginTop:12}}>
 <h3>Counter: {counter}</h3>
 <button onClick={() => dispatch({type:'decrement'})} style={{marginRight:8}}>-</button>
 <button onClick={() => dispatch({type:'increment'})}>+</button>
 </div>
 )
}
