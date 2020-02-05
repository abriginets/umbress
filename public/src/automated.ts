/**
 * Core modules
 */

/**
 * Engine modules
 */

import './automated.scss'

/**
 * Logic
 */
;((): void => {
    ;(document.querySelector('.usercontent') as HTMLElement).style.display = 'block'

    setTimeout(() => {
        const uuid = (document.getElementById('skuid') as HTMLInputElement).value,
            dict = '0123456789',
            numbers: number[] = [],
            letters: string[] = []

        uuid.split('').forEach(symbol => {
            if (dict.includes(symbol)) numbers[numbers.length] = parseInt(symbol)
            else letters[letters.length] = symbol
        })
        ;(document.getElementById('jschallenge_answer') as HTMLInputElement).value = (
            numbers.reduce((a, b) => Math.pow(a, a > 0 ? 1 : a) * Math.pow(b, b > 0 ? 1 : b)) * letters.length
        ).toString()
        ;(document.getElementById('challenge-form') as HTMLFormElement).submit()
    }, 4000)
})()
