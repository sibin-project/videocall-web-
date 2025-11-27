import React, { useContext, useEffect, useState } from "react"
import { Auth } from '../../firebase/firebase'
import { onAuthStateChanged } from "firebase/auth"
const Authcontext = React.createContext()
export function useAuth() {
    return useContext(Authcontext)
}
function Authprovider({ children }) {
    const [currentUser, setCurrentUser] = useState(null)
    const [userLoggedIn, setUserLoggedIn] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(Auth, initializeUser)
        return unsubscribe;
    }, [])

    async function initializeUser(user) {
        if (user) {
            setCurrentUser({ ...user })
            setUserLoggedIn(true)
        } else {
            setCurrentUser({ ...user })
            setUserLoggedIn(false)
        }
        setLoading(false)
    }
    const value = {
        currentUser,
        userLoggedIn,
        loading
    }

    return (
        <Authcontext.Provider value={value}>
            {!loading && children}
        </Authcontext.Provider>
    )
};

export default Authprovider