import { toast } from "react-toastify";

const toastHandler = (text, status) => {
    const options = {
        position: "top-center",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
    };
    if (status === 'success') {
        toast.success(text, options);
        return;
    }
    if (status === 'warning') {
        toast.warning(text, options);
        return;
    }
    if (status === 'error') {
        toast.error(text, options);
        return;
    }
    toast.info(text, options); // Default case
};

export default toastHandler;
