import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { password } = await request.json()
    
    // Get the password from environment variable
    const correctPassword = process.env.FRANK_PWD
    
    if (!correctPassword) {
      console.error("FRANK_PWD environment variable not set")
      return NextResponse.json(
        { success: false, message: "Authentication configuration error" },
        { status: 500 }
      )
    }
    
    // Compare the provided password with the environment variable
    if (password === correctPassword) {
      return NextResponse.json({ 
        success: true,
        message: "Authenticated successfully" 
      })
    } else {
      return NextResponse.json(
        { success: false, message: "Invalid password" },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    )
  }
}
