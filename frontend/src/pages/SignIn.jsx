import { useAuth } from '../context/AuthContext';
import { BottomWarning } from "../components/BottomWarning"
import { LongButton } from "../components/LongButton"
import { Heading } from "../components/Heading"
import { InputBox } from "../components/InputBox"
import { SubHeading } from "../components/SubHeading"
import { useState } from "react"
import axios from "axios";
import { useNavigate } from "react-router-dom"
import AppBar from "../components/AppBar";
import { API_ENDPOINTS } from "../apiConfig"

export const SignIn = () => {

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    try {
        const loginResponse = await axios.post(API_ENDPOINTS.login, { username, password }, { withCredentials: true });
        if (loginResponse.status === 200) {
            const validateResponse = await axios.get(API_ENDPOINTS.validate, { withCredentials: true });
            if (validateResponse.data && validateResponse.data.userId) {
                const userInfo = {
                    userId: validateResponse.data.userId,
                    firstName: validateResponse.data.firstName,
                    lastName: validateResponse.data.lastName
                };
                setUser(userInfo); 
                navigate("/home");
            } else {
                throw new Error("Failed to fetch user details.");
            }
        } else {
            alert("Login failed: " + (loginResponse.data.message || "Unexpected response format"));
        }
    } catch (error) {
        console.error("Login failed:", error.response?.data?.message || error.message);
        alert("Login failed: " + (error.response?.data?.message || "An error occurred"));
    }
}; 

const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
        handleSubmit(event);
    }
};
    return <div>
            <AppBar/>
            <div className="bg-slate-200 h-screen flex justify-center" onKeyDown={handleKeyPress}>
            <div className="flex flex-col justify-center md:mt-16">
            <div className="rounded-lg bg-white w-80 text-center p-2 h-max px-4">
                <Heading label={"Sign in"} />
                <SubHeading label={"Enter your credentials to access your account"} />
                <InputBox onChange = {(e)=>{
                setUsername(e.target.value);
                }} placeholder="johndoe@gmail.com" label={"Email"} />
                <InputBox type="password" onChange={(e)=>{
                setPassword(e.target.value);
                }} placeholder="john@12345" label={"Password"} />
                <div className="pt-4">
                <LongButton onClick = {handleSubmit} label={"Sign in"} />
                </div>
                <BottomWarning label={"Don't have an account?"} buttonText={"Sign up"} to={"/signup"} />
            </div>
            </div>
        </div>
    </div>
}