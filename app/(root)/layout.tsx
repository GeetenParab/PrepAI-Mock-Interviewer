import { ReactNode } from 'react'
import Link from "next/link";
import Image from "next/image";
import { isAuthenticated } from "@/lib/actions/auth.action";
import { redirect } from "next/navigation";


const RootLayout = async ({ children }: { children: ReactNode }) => {
    const isUserAunthenticated = await isAuthenticated();

    if (!isUserAunthenticated) redirect('/sign-in');

    return (
        <div className="root-layout">
            <nav className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <Image src="/logo.svg" alt="PrepAI Logo" width={38} height={32} />
                    {/* <Image src="/icon.webp" alt="PrepAI Logo" width={38} height={32} /> */}
                    <h2 className="text-primary-100">PrepAI</h2>
                </Link>
                <div className="flex items-center gap-4">
                    <Link href="/resumes" className="nav-link">
                        Resumes
                    </Link>
                    <Link href="/interview" className="nav-link">
                        Interview
                    </Link>
                </div>
            </nav>
            {children}
        </div>
    )
}
export default RootLayout