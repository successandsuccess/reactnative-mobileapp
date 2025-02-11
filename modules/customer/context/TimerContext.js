import React, { createContext, useState, useContext } from 'react'

export const timerContext = createContext({
    timer: 0,
    setTime: () => { },

    timeDisplay: "0:00",
    setTimeDisplay: () => { },
})

export default function TimerContext(props) {
    const [timer, setTime] = useState(0);
    const [timeDisplay, setTimeDisplay] = useState("0:00");

    const defaultTimerContext = {
        timer,
        setTime: (v) => setTime(v),

        timeDisplay,
        setTimeDisplay: () => setTimeDisplay(fmtMSS(timer))
    }

    return (
        <timerContext.Provider value={defaultTimerContext}>
            {props.children}
        </timerContext.Provider>
    )
}

function fmtMSS(s) {
    return (s - (s %= 60)) / 60 + (9 < s ? ':' : ':0') + s
}

export const useTimer = () => useContext(timerContext);