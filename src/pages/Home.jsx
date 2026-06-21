import React from 'react'
import ProblemList from '../components/ProblemList'
import Counter from '../components/Counter'

export default function Home(){
 return (
 <main>
 <h1>Welcome to MetaMaths</h1>
 <p>This is the home page.</p>
 <Counter />
 <ProblemList />
 </main>
 )
}
