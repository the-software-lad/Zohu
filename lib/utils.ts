export const formatPrice = (value : number, currency: string = "INR")=>{
    const locale = currency == "INR" ? "en-IN" : undefined;
    return new Intl.NumberFormat(locale, {
        style:"currency",
        currency,
        maximumFractionDigits:0,
    }).format(value);
};