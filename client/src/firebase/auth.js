import { Auth } from './firebase'
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'

export const doSignInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(Auth, provider);
}

export const doSignOut = () => {
    return signOut(Auth)
}