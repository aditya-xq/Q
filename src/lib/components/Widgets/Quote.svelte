<script lang="ts">
    import { onMount } from 'svelte'

    interface Quote {
        text: string
        author: string
    }

    let quote = $state<Quote | null>(null)

    // Curated collection of inspiring quotes
    const quotes: Quote[] = [
        { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
        { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
        { text: "Life is 10% what happens to you and 90% how you react to it.", author: "Charles R. Swindoll" },
        { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
        { text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
        { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
        { text: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
        { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
        { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
        { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
        { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
        { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
        { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
        { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
        { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
        { text: "Believe in yourself. You are braver than you think, more talented than you know, and capable of more than you imagine.", author: "Roy T. Bennett" },
        { text: "I learned that courage was not the absence of fear, but the triumph over it.", author: "Nelson Mandela" },
        { text: "There is only one way to avoid criticism: do nothing, say nothing, and be nothing.", author: "Aristotle" },
        { text: "Do what you can with all you have, wherever you are.", author: "Theodore Roosevelt" },
        { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
        { text: "The only person you are destined to become is the person you decide to be.", author: "Ralph Waldo Emerson" },
        { text: "Go confidently in the direction of your dreams. Live the life you have imagined.", author: "Henry David Thoreau" },
        { text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "Ralph Waldo Emerson" },
        { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
        { text: "The best revenge is massive success.", author: "Frank Sinatra" },
        { text: "Do not go where the path may lead, go instead where there is no path and leave a trail.", author: "Ralph Waldo Emerson" },
        { text: "Build your own dreams, or someone else will hire you to build theirs.", author: "Farrah Gray" },
        { text: "The question isn't who is going to let me; it's who is going to stop me.", author: "Ayn Rand" },
        { text: "Whatever the mind of man can conceive and believe, it can achieve.", author: "Napoleon Hill" },
        { text: "Twenty years from now you will be more disappointed by the things that you didn't do than by the ones you did do.", author: "Mark Twain" },
        { text: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" },
        { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
        { text: "Everything has beauty, but not everyone can see.", author: "Confucius" },
        { text: "How wonderful it is that nobody need wait a single moment before starting to improve the world.", author: "Anne Frank" },
        { text: "Life is 10% what happens to me and 90% of how I react to it.", author: "Charles Swindoll" },
        { text: "An unexamined life is not worth living.", author: "Socrates" },
        { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
        { text: "Winning isn't everything, but wanting to win is.", author: "Vince Lombardi" },
        { text: "The mind is everything. What you think you become.", author: "Buddha" },
        { text: "Definiteness of purpose is the starting point of all achievement.", author: "W. Clement Stone" },
        { text: "Life is what happens to you while you're busy making other plans.", author: "John Lennon" },
        { text: "We become what we think about.", author: "Earl Nightingale" },
        { text: "The best way to predict the future is to create it.", author: "Peter Drucker" },
        { text: "If you can dream it, you can achieve it.", author: "Zig Ziglar" }
    ]

    function getRandomQuote(): Quote {
        return quotes[Math.floor(Math.random() * quotes.length)]
    }

    onMount(() => {
        quote = getRandomQuote()
    })
</script>

{#if quote}
    <div class="max-w-lg mx-auto mb-12">
        <div>
            <blockquote class="text-left">
                <p class="text-xl text-slate-400 dark:text-slate-700">
                    {quote.text}
                </p>
                <footer class="text-end">
                    <cite class="text-lg text-slate-400 dark:text-slate-700 not-italic">
                        — {quote.author}
                    </cite>
                </footer>
            </blockquote>
        </div>
    </div>
{/if}
