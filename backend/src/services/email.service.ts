export async function sendVerificationEmail(
    email:string,
    code:string
){

    console.log("--------------------------------");
    console.log("EMAIL VERIFICATION");
    console.log("--------------------------------");

    console.log("Destination:");
    console.log(email);

    console.log("Verification Code:");
    console.log(code);

    console.log("--------------------------------");


    return true;

}