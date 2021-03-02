// IN PROGRESS --

const { getOurBrands } = require('./our-brands')



async function run() {
    const page_url = "https://www.amazon.com/s?k=lcd";
    let response = await getOurBrands(page_url);
    console.log(response);
}


run();