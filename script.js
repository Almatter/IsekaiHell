$(document).ready(function() {
    // array of grades
    var grades = ['F','E', 'D', 'C', 'B', 'A', 'S'];
    // populate select options
    $('.stat-grade').each(function() {
        for (var i = 0; i < grades.length; i++) {
            $(this).append('<option value="'+(i*7)+'">'+grades[i]+'</option>');
        }
    });

    // listeners for when select options or earned points are changed
    $('.stat-grade, #earned-points').change(calculatePoints);
    
    // add skill
    $('#add-skill').click(function() {
        $('#skills').append('<div><input type="text" class="skill"><select class="skill-grade"></select></div>');
        $('.skill-grade').each(function() {
            if ($(this).children().length == 0) {
                for (var i = 0; i < grades.length; i++) {
                    $(this).append('<option value="'+(i*7)+'">'+grades[i]+'</option>');
                }
            }
        });
        $('.skill-grade').change(calculatePoints);
    });

    // add equipment
    $('#add-equipment').click(function() {
        $('#equipment').append('<div><input type="text" class="equipment"><select class="equipment-grade"></select><input type="number" class="base-price"><input type="checkbox" class="manual-input"></div>');
        $('.equipment-grade').each(function() {
          if ($(this).children().length == 0) {
            for (var i = 0; i < grades.length; i++) {
              $(this).append('<option value="'+(i*7)+'">'+grades[i]+'</option>');
            }
          }
        });
        $('.equipment-grade, .base-price, .manual-input').change(calculatePoints);
        });
    });

// function to calculate points
function calculatePoints() {
    var points = 0;
    // add earned points
    points += parseInt($('#earned-points').val()) || 0;
    // add skill points
    $('.skill-grade').each(function() {
        points += parseInt($(this).val()) || 0;
    });
    // add stat points
    $('.stat-grade').each(function() {
        points += parseInt($(this).val()) || 0;
    });
    // add equipment points
    $('.equipment').each(function() {
        if ($(this).find('.manual-input').is(':checked')) {
            points += parseInt($(this).find('.base-price').val()) || 0;
        } else {
            points += parseInt($(this).find('.equipment-grade').val()) || 0;
        }
    });
    // update points
    $('#point-value').text(points);
    // check if over limit
    if (points > 105) {
        $('#points').css('color', 'red');
        alert('Points exceed limit!');
    } else {
        $('#points').css('color', '#ddd');
    }
}
