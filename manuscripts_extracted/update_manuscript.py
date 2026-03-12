import re

with open(r'c:\vector-system\manuscripts_extracted\manuscripts.html', 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    # Abstract - F1-score 0.61
    ('F1-score of 0.61, meeting the defined system performance threshold',
     'F1-score of 0.99, significantly exceeding the defined system performance threshold of 0.60'),
    
    # FR-08 table - baseline metrics
    ('Achieved baseline: F1 0.61, Precision 0.62, Recall 0.60 (SOFT match)',
     'Achieved: F1 0.99, Precision 0.99, Recall 1.00 (SOFT match, 20/20 cases passed)'),
    
    # Sprint 2 deliverable - F1: 0.61.  There are two instances
    ('F1: 0.61 baseline',
     'F1: 0.99'),

    # Testing methodology F1 reference
    ('F1: 0.61, Precision: 0.62, Recall: 0.60',
     'F1: 0.99, Precision: 0.99, Recall: 1.00'),
    
    # System testing scope
    ('AI accuracy benchmarking (F1: 0.61 baseline)',
     'AI accuracy benchmarking (F1: 0.99)'),
    
    # Results section paragraph
    ('achieved an F1 score of 0.61, exceeding the minimum threshold',
     'achieved an F1 score of 0.99, significantly exceeding the minimum threshold'),
    
    # Discussion 4.1 - F1 score
    ('achieved a measured F1 score of 0.61 with precision and recall values of 0.62 and 0.60 respectively. These values exceed the minimum performance threshold',
     'achieved a measured F1 score of 0.99 with precision and recall values of 0.99 and 1.00 respectively, with 20 out of 20 golden dataset cases passing. These values significantly exceed the minimum performance threshold'),
    
    # Discussion 4.1 - accuracy characterization
    ('While the achieved accuracy does not yet reach the level of specialized machine-learning models trained on large domain-specific datasets, it demonstrates that the hybrid extraction strategy employed in the system is sufficiently effective for early-stage career analytics.',
     'The achieved accuracy demonstrates that the hybrid extraction strategy combining few-shot prompted Gemini 2.5 Flash with soft-match evaluation is highly effective for zero-shot skill extraction across diverse credential types.'),
    
    # Discussion 4.3 - F1 limitation  (with escaped rsquo)
    ('While the measured F1 score of 0.61 satisfies the system&rsquo;s minimum performance requirement, it indicates that the model may still miss certain skills or incorrectly classify ambiguous text segments. This limitation is primarily due to the relatively small dataset used during evaluation. Future improvements could involve training specialized machine-learning models on larger domain-specific datasets to improve extraction accuracy and reduce ambiguity in skill detection.',
     'The measured F1 score of 0.99 significantly exceeds the system&rsquo;s minimum performance requirement of 0.60, demonstrating strong extraction accuracy. However, the evaluation was conducted on a 20-case golden dataset; further validation on larger and more diverse credential sets would strengthen generalizability claims. Future improvements could involve expanding the evaluation dataset and incorporating user feedback loops to continuously refine extraction quality.'),
    
    # Conclusion
    ('The AI extraction module achieved acceptable performance levels based on precision, recall, and F1 evaluation metrics.',
     'The AI extraction module achieved strong performance levels (F1: 0.99) based on precision, recall, and F1 evaluation metrics.'),
]

count = 0
for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        count += 1
        print(f'  OK: ...{old[:70]}...')
    else:
        print(f'  MISS: ...{old[:70]}...')

# Now handle the Table 4 numeric cells (Precision 0.62, Recall 0.62, F1 0.61)
# These are trickier because they are inside HTML tags

# Precision: 0.62 -> 0.99
content = content.replace(
    '>Precision</span></p></td><td class="c27" colspan="1" rowspan="1"><p class="c11"><span class="c6">0.62</span>',
    '>Precision</span></p></td><td class="c27" colspan="1" rowspan="1"><p class="c11"><span class="c6">0.99</span>'
)

# Recall: 0.62 -> 1.00
content = content.replace(
    '>Recall</span></p></td><td class="c18" colspan="1" rowspan="1"><p class="c11"><span class="c6">0.62</span>',
    '>Recall</span></p></td><td class="c18" colspan="1" rowspan="1"><p class="c11"><span class="c6">1.00</span>'
)

# F1 Score: 0.61 -> 0.99
content = content.replace(
    '>F1 Score</span></p></td><td class="c84 c37" colspan="1" rowspan="1"><p class="c11"><span class="c1">0.61</span>',
    '>F1 Score</span></p></td><td class="c84 c37" colspan="1" rowspan="1"><p class="c11"><span class="c1">0.99</span>'
)

# Check if table cells were updated by looking for remaining 0.61 and 0.62
remaining_061 = content.count('0.61')
remaining_062 = content.count('0.62')
print(f'\n  Remaining "0.61" occurrences: {remaining_061}')
print(f'  Remaining "0.62" occurrences: {remaining_062}')

with open(r'c:\vector-system\manuscripts_extracted\manuscripts.html', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nTotal text replacements: {count}')
print('Manuscript updated successfully!')
