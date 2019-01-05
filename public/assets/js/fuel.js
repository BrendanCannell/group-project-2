$(function() {

    var editId;
    var file;

    $(".file-field :input").change(function(e) {

        for (var i = 0; i < e.originalEvent.srcElement.files.length; i++) {

            file = e.originalEvent.srcElement.files[i];
            console.log(file);

            var img = document.createElement("img");
            var reader = new FileReader();
            reader.onloadend = function() {
                img.src = reader.result;
                
            }
            reader.readAsDataURL(file);

            $("#picField").append(img);

            $("#subButton").css("visibility", "visible");
            $("input").css("visibility", "hidden");

        }
    });

    $("#receiptPic").on('submit', function(event) {
      const xhr = new XMLHttpRequest();
      const fd = new FormData();
      
      xhr.open("POST", "/api/image", true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
          var data = JSON.parse(xhr.responseText);

          var fields = [['place'],
                        ['address'],
                        ['gallons'],
                        ['price', 'total'],
                        ['perGallon']];

          fields.forEach(([key, id = key]) => {
            var value = data[key];
            var el = $('#' + id);

            el.css("visibility", "visible");
            if (value) el.val(value);
          })
        }
      };
      fd.append('myImage', file);
      // Initiate a multipart/form-data upload
      xhr.send(fd);
    })

    $("#add-btn").on('click', function(event) {
        event.preventDefault();

        var newReading = {
            place: $("#place").val().trim(),
            address: $("#address").val().trim(),
            gallons: $("#gallons").val().trim(),
            total: $("#total").val().trim(),
            perGallon: $("#perGallon").val().trim()
        };


        $("#place").val("");
        $("#address").val("");
        $("#gallons").val("");
        $("#total").val("");
        $("#perGallon").val("");

        $.post("/api/readings", newReading).then(function(result) {
    
            console.log(result);
            location.reload();
          });
          
    });

    $(".delete").on("click", function(event) {
        event.preventDefault();
        var id = $(this).attr("id");
        
        $.ajax({
            method: "DELETE",
            url: "/api/delete/" + id
          })
            .then(function(result) {
             console.log("ID: " + result + " deleted"); 
             location.reload();
            });
    });

    $(".edit").on("click", function(event) {
       event.preventDefault();
       editId = $(this).attr("data-edit");
       $.get("/api/find/" + editId).then(function(result) {
           console.log(result);

           $("#edit-btn").css("visibility", "visible");
           $("#add-btn").css("visibility", "hidden");
           
           $("#place").val(result.place);
           $("#address").val(result.address);
           $("#gallons").val(result.gallons);
           $("#total").val(result.price);
           $("#perGallon").val(result.perGallon);
       });
    });

    $("#edit-btn").on("click", function(event) {
        event.preventDefault();

        var editReading = {
            place: $("#place").val().trim(),
            address: $("#address").val().trim(),
            gallons: $("#gallons").val().trim(),
            total: $("#total").val().trim(),
            perGallon: $("#perGallon").val().trim()
        };


        $("#place").val("");
        $("#address").val("");
        $("#gallons").val("");
        $("#total").val("");
        $("#perGallon").val("");
        $.ajax({
            method: "PUT",
            url: "/api/update/" + editId,
            data: editReading
          }).then(function(result) {
              console.log(result);
              location.reload();
          })
        
    });
});