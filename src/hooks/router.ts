import { useNavigate } from "react-router-dom";


function onNavPreserveQuery() {
    const navigateInternal = useNavigate()

    return {
        navigate: (to: string) => {
            navigateInternal(to, {  })
        }
    }
}