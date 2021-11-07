export const tryCatch = async (action, onError) => {
    try {
        const result = await action()
        return [result, null]
    } catch (error) {
        console.error(error)
        if (onError) {
            await onError(error)
        }
        return [null, error]
    }
}