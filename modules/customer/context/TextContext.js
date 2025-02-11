import React, { createContext, useState } from "react";


export const textContext = createContext("");

export default function TextContext(props) {
    const [textVal, textUpdate] = useState([]);

    const provider = {
        textVal,
        textUpdate
    }

    return (
        <textContext.Provider value={{ provider }}>
            {props.children}
        </textContext.Provider>
    )
}

export const useTextContext = () => useContext(textContext);