export function camelCaseToWords(value: string): string {
    let result = value.replace(/([A-Z])/g, ' $1');

    return result.charAt(0).toUpperCase() + result.slice(1);
}
