import './recaptcha.scss'

/**
 * Logic
 */

declare global {
    interface Window {
        onloadCallback(): void
    }
}

window.onloadCallback = function (): void {
    const hOne = document.querySelector('.recaptcha-content h1') as HTMLElement
    const p = document.querySelector('.recaptcha-content p') as HTMLElement

    if (hOne.innerText.length > 0) hOne.style.display = 'block'
    if (p.innerText.length > 0) p.style.display = 'block'

    grecaptcha.render('recaptcha_container', {
        sitekey: '%recaptchaSiteKey%',
        callback: function () {
            setTimeout(() => {
                ;(document.getElementById('grecaptcha_form') as HTMLFormElement).submit()
            }, 1500)
        }
    })
}
